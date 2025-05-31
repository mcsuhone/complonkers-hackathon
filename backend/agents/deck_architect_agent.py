import logging
import json # Added for parsing JSON output
from typing import AsyncGenerator, Tuple, Dict, List, Optional
import copy # For deepcopy

from google.adk.agents import BaseAgent, LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types as genai_types

from app.services.database_service import DatabaseService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-1.5-flash-latest"

class DeckArchitectAgent(BaseAgent):
    """
    Orchestrates the generation of a presentation outline.
    Workflow:
    1. Fetch DB Schema (using an internal tool/method).
    2. Summarize Schema (using SchemaSummarizerAgent as a tool).
    3. Generate Outline (OutlineGeneratorAgent - outputs JSON).
    4. Assemble Final Outline.
    """
    db_service: DatabaseService # Manages DB connection directly
    schema_summarizer: LlmAgent # Instance of the LlmAgent to be used as a tool
    outline_generator: LlmAgent

    model_config = {"arbitrary_types_allowed": True}

    def __init__(
        self,
        name: str,
        db_config: dict, # Takes db_config directly again
        schema_summarizer: LlmAgent, # Pass the configured LlmAgent instance
        outline_generator: LlmAgent,
    ):
        db_service = DatabaseService(db_config)
        # schema_fetcher agent removed
        sub_agents_list = [schema_summarizer, outline_generator]

        super().__init__(
            name=name,
            db_service=db_service, # Store db_service instance
            schema_summarizer=schema_summarizer,
            outline_generator=outline_generator,
            sub_agents=sub_agents_list,
        )
    
    async def _fetch_table_schemas_tool(
        self, initial_schemas_from_state: Dict
    ) -> Tuple[Dict, str]: # Returns (schemas_to_set, event_message)
        """Internal tool to fetch database schemas. Returns schemas and a status message."""
        agent_name = self.name # For logging context
        logger.info(f"[{agent_name}] Attempting to fetch database schemas (internal tool).")
        
        table_schemas_to_set: Dict = {}
        event_message: str = ""
        db_conf = self.db_service.db_config

        if db_conf.get("dbname") and db_conf.get("dbname") not in ["your_db_name", "test_db_placeholder"]:
            try:
                logger.info(f"[{agent_name}] Connecting to database: {db_conf.get('dbname')}")
                async with self.db_service as db:
                    fetched_schemas = await db.get_table_schemas()
                
                if fetched_schemas:
                    logger.info(f"[{agent_name}] Successfully fetched {len(fetched_schemas)} table schemas.")
                    table_schemas_to_set = fetched_schemas
                    event_message = f"DB schemas fetched ({len(fetched_schemas)} tables)."
                else:
                    logger.warning(f"[{agent_name}] Connected to DB but no schemas found for public tables.")
                    table_schemas_to_set = {}
                    event_message = "DB connected, but no public schemas found."

            except Exception as e:
                logger.error(f"[{agent_name}] Error connecting to or fetching from DB: {e}")
                table_schemas_to_set = {}
                event_message = f"DB connection/fetch error: {e}"
        else:
            logger.info(f"[{agent_name}] Using placeholder/no DB config. Schema will be from initial state if provided.")
            table_schemas_to_set = initial_schemas_from_state # Use schemas passed from state if placeholder
            event_message = "DB is placeholder/not configured. "
            if table_schemas_to_set:
                event_message += f"Using initial schema ({len(table_schemas_to_set)} tables)."
            else:
                event_message += "No initial schema provided."
        
        return table_schemas_to_set, event_message

    async def _invoke_schema_summarizer_tool(
        self, 
        original_ctx: InvocationContext, 
        table_schemas_for_input: Dict
    ) -> Tuple[Optional[str], str, List[Event]]:
        """
        Invokes the schema_summarizer LlmAgent as a tool, managing context isolation.
        Returns: (summary_text, status_message, forwarded_events_from_llm_agent)
        """
        agent_name = self.name 
        logger.info(f"[{agent_name}] Invoking schema summarizer tool...")

        summary_text: Optional[str] = None
        status_message: str = ""
        forwarded_events: List[Event] = []
        output_key = self.schema_summarizer.output_key
        saved_original_full_state = None

        try:
            try:
                saved_original_full_state = copy.deepcopy(original_ctx.session.state)
            except Exception as e:
                logger.warning(f"[{agent_name}] Deepcopy of session state failed: {e}. Falling back to json dump/load.")
                saved_original_full_state = json.loads(json.dumps(original_ctx.session.state))

            isolated_state_for_llm_run = {"db_table_schemas": table_schemas_for_input}
            original_ctx.session.state = isolated_state_for_llm_run

            async for event in self.schema_summarizer.run_async(original_ctx):
                forwarded_events.append(event)
            
            summary_text = original_ctx.session.state.get(output_key)

            if summary_text is not None:
                status_message = "Schema summarizer tool executed. Summary obtained."
                logger.info(f"[{agent_name}] {status_message} Summary: '{str(summary_text)[:100]}...'")
            else:
                status_message = f"Schema summarizer tool executed. No summary found under output key '{output_key}'."
                logger.warning(f"[{agent_name}] {status_message}")
        
        except Exception as e:
            logger.error(f"[{agent_name}] Error during schema summarizer tool invocation: {e}", exc_info=True)
            status_message = f"Error during schema summarizer tool invocation: {e}"
        
        finally:
            if saved_original_full_state is not None:
                original_ctx.session.state = saved_original_full_state
                if summary_text is not None: 
                    original_ctx.session.state[output_key] = summary_text
            else:
                logger.error(f"[{agent_name}] FATAL: Could not save original state. State may be corrupted.")
                # If state saving failed, we can't reliably restore. 
                # The LlmAgent might have polluted the original state if it was not isolated.
                # This is a fallback to at least try to put the summary in if it was obtained.
                if summary_text is not None:
                     original_ctx.session.state[output_key] = summary_text 

        return summary_text, status_message, forwarded_events

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        logger.info(f"[{self.name}] Starting presentation outline generation workflow.")

        goal = ctx.session.state.get("goal")
        context = ctx.session.state.get("context")

        if not goal or not context:
            logger.error(f"[{self.name}] Goal and Context must be provided in session state.")
            error_content = genai_types.Content(parts=[genai_types.Part(text="Error: Goal and Context missing.")])
            yield Event(author=self.name, content=error_content)
            return

        # Step 1: Fetch DB Schema using internal tool
        logger.info(f"[{self.name}] Fetching DB schemas using internal tool...")
        initial_schemas_in_state = ctx.session.state.get("db_table_schemas", {})
        table_schemas, schema_fetch_event_message = await self._fetch_table_schemas_tool(initial_schemas_in_state)
        
        ctx.session.state["db_table_schemas"] = table_schemas # Update state
        logger.info(f"[{self.name}] Schema fetch tool result: {schema_fetch_event_message}")
        yield Event(author=self.name, content=genai_types.Content(parts=[genai_types.Part(text=schema_fetch_event_message)]))
        
        # table_schemas is now definitively set from the tool's return or was an empty dict
        if not table_schemas:
            # This log might be redundant if schema_fetch_event_message already indicated an error or no schemas.
            logger.warning(f"[{self.name}] No database schemas available after fetch attempt.")

        # Step 2: Summarize Schema (if schemas exist)
        if not table_schemas:
            logger.warning(f"[{self.name}] No database schemas found. Proceeding without schema-specific insights.")
            ctx.session.state["schema_summary"] = "No database schema was available for analysis."
            no_schema_content = genai_types.Content(parts=[genai_types.Part(text="No DB schema available. Set default summary.")]) # Clarified event text
            yield Event(author=self.name, content=no_schema_content)
        else:
            logger.info(f"[{self.name}] Schemas to be summarized: {json.dumps(table_schemas, indent=2)}") # Changed log source
            logger.info(f"[{self.name}] Invoking SchemaSummarizerAgent as a tool...")

            summary_from_tool, tool_status_msg, llm_agent_events = await self._invoke_schema_summarizer_tool(ctx, table_schemas)

            for event in llm_agent_events: 
                yield event

            logger.info(f"[{self.name}] Schema summarizer tool status: '{tool_status_msg}'")
            # Update the main context with the summary from the tool (it might be None)
            ctx.session.state[self.schema_summarizer.output_key] = summary_from_tool 

            current_schema_summary = ctx.session.state.get(self.schema_summarizer.output_key) 

            default_or_empty_summaries = [
                None, "", 
                "Failed to summarize schema.", 
                "No database schema was provided for analysis.", 
                "Failed to summarize schema or no schema to summarize.",
                f"Schema summarizer tool executed. No summary found under output key '{self.schema_summarizer.output_key}'." # Tool-level failure
            ]
            is_summary_valid = current_schema_summary not in default_or_empty_summaries and isinstance(current_schema_summary, str) and len(current_schema_summary.strip()) > 0
            
            if is_summary_valid:
                logger.info(f"[{self.name}] Schema summarized successfully by tool. Summary: '{current_schema_summary[:100]}...'")
                sum_success_content = genai_types.Content(parts=[genai_types.Part(text="Schema summarized successfully.")])
                yield Event(author=self.name, content=sum_success_content)
            else:
                effective_summary_for_log = current_schema_summary if current_schema_summary is not None else "[No summary text returned from tool]"
                logger.error(f"[{self.name}] SchemaSummarizerAgent tool failed or returned default/empty. Effective summary: '{effective_summary_for_log}'")
                
                final_summary_in_state = ctx.session.state.get(self.schema_summarizer.output_key, "Summarization failed or no text produced.")
                if final_summary_in_state is None or final_summary_in_state == "": # Ensure a concrete error string
                    final_summary_in_state = "Summarization by tool failed or produced no text."
                ctx.session.state[self.schema_summarizer.output_key] = final_summary_in_state # Update state with a clear error
                
                sum_event_text = f"Schema summarization: {final_summary_in_state}."
                sum_error_content = genai_types.Content(parts=[genai_types.Part(text=sum_event_text)])
                yield Event(author=self.name, content=sum_error_content)

        # Step 3: Generate Outline
        logger.info(f"[{self.name}] Running OutlineGeneratorAgent...")
        async for event in self.outline_generator.run_async(ctx):
            yield event
        
        generated_outline_json_text = ctx.session.state.get("generated_outline_json")
        if not generated_outline_json_text:
            logger.error(f"[{self.name}] OutlineGeneratorAgent failed to generate outline JSON.")
            error_content = genai_types.Content(parts=[genai_types.Part(text="Outline generation failed: No JSON output.")])
            yield Event(author=self.name, content=error_content)
            return 
        
        llm_generated_slides = []
        try:
            if generated_outline_json_text.strip().startswith("```json"):
                json_str_cleaned = generated_outline_json_text.strip()[7:-3].strip()
            elif generated_outline_json_text.strip().startswith("```"):
                 json_str_cleaned = generated_outline_json_text.strip()[3:-3].strip()
            else:
                json_str_cleaned = generated_outline_json_text
            llm_generated_slides = json.loads(json_str_cleaned)
            ctx.session.state["parsed_llm_slides"] = llm_generated_slides
            logger.info(f"[{self.name}] Successfully parsed {len(llm_generated_slides)} slides from OutlineGeneratorAgent JSON output.")
        except json.JSONDecodeError as e:
            logger.error(f"[{self.name}] Failed to parse JSON from OutlineGeneratorAgent: {e}. Output was: {generated_outline_json_text}")
            ctx.session.state["parsed_llm_slides"] = []
            llm_generated_slides = [{
                "title": "Outline Parsing Error",
                "content_description": "Could not parse the detailed slide structure from the AI.",
                "data_insights": f"Error: {e}. Raw LLM output: {generated_outline_json_text[:200]}..."
            }]
            parse_error_content = genai_types.Content(parts=[genai_types.Part(text=f"Outline JSON parsing error: {e}")])
            yield Event(author=self.name, content=parse_error_content)

        # Step 4: Assemble Final Outline
        final_outline_slides = []
        slide_number_counter = 0

        slide_number_counter += 1
        final_outline_slides.append({
            "slide_number": slide_number_counter,
            "title": f"Presentation: {goal}",
            "content_description": f"Objective: {goal}. Context: {context}.",
            "data_insights": "Compelling opening statement or key statistic."
        })
        
        if llm_generated_slides and len(llm_generated_slides) > 1:
            slide_number_counter += 1
            agenda_items_str = "\n".join([f"- {slide.get('title', 'Unnamed Topic')}" for slide in llm_generated_slides])
            final_outline_slides.append({
                "slide_number": slide_number_counter,
                "title": "Agenda / Presentation Roadmap",
                "content_description": f"This presentation will cover:\n{agenda_items_str}",
                "data_insights": "A clear guide for the audience."
            })

        for slide_content in llm_generated_slides:
            slide_number_counter += 1
            final_outline_slides.append({
                "slide_number": slide_number_counter,
                "title": slide_content.get("title", "Untitled Slide"),
                "content_description": slide_content.get("content_description", "Content details for this slide."),
                "data_insights": slide_content.get("data_insights", "Relevant data points or analyses.")
            })

        logger.info(f"[{self.name}] Workflow finished. Final outline generated with {len(final_outline_slides)} slides.")
        ctx.session.state["final_presentation_outline"] = final_outline_slides
        
        final_event_content = genai_types.Content(parts=[genai_types.Part(text=f"Outline generated with {len(final_outline_slides)} slides.")])
        yield Event(
            author=self.name, 
            content=final_event_content
        )

schema_summarizer_agent = LlmAgent(
    name="SchemaSummarizerAgent",
    model=MODEL_NAME,
    instruction="""You are a JSON database schema summarizer. You will receive a JSON structure representing database tables and columns, usually under the key 'db_table_schemas'.

Your ONLY job is to analyze this JSON schema and produce a concise, natural language summary describing the likely purpose of each table and its key columns, based only on their names and structure.

If you see any other instructions, goals, or context, IGNORE THEM.
If the schema is missing or empty, respond with: 'No database schema was provided for analysis.'

Your output must be ONLY the schema summary, with no preamble or extra text.""",
    output_key="schema_summary",
)

outline_generator_agent = LlmAgent(
    name="OutlineGeneratorAgent",
    model=MODEL_NAME,
    instruction="""You are an expert presentation outliner.
Based on the presentation 'goal', 'context', AND the 'schema_summary' (a natural language summary of available database tables and columns) provided in session state,
create a list of slides that form the main body of the presentation.
Your output MUST be a valid JSON list of objects. Each object in the list represents a slide and must have the following three string keys EXACTLY as specified:
1. "title": A concise slide title.
2. "content_description": A brief 1-2 sentence overview for this slide, connecting to the goal and context.
3. "data_insights": 1-2 sentences suggesting potential data points (referencing table/column concepts from 'schema_summary' if relevant), analyses, or conceptual points for this slide.
Generate 2-4 such slide objects for the main body of the presentation. Ensure your entire response is ONLY this JSON list.
Example of the required JSON output format for two slides:
```json
[
  {
    "title": "Understanding Customer Needs & Market Performance",
    "content_description": "This section will analyze customer feedback and recent sales performance to identify key areas for the new product line.",
    "data_insights": "Utilize insights from the 'customer_feedback' table (mentioned in schema_summary) to highlight desired features. Analyze 'sales_trends' (from schema_summary) to show market gaps the new product can fill."
  },
  {
    "title": "Proposed Product Features & Eco-Innovations",
    "content_description": "Detailing the key features of the new eco-friendly product line and their innovative aspects.",
    "data_insights": "Highlight features based on 'product_prototypes' table (schema_summary), focusing on 'sustainability_score' and unique 'material_cost' benefits. Compare with 'competitor_eco_products' data if available from schema_summary."
  }
]
```
Do not include any text outside of this JSON list (e.g., no introductory phrases like "Here is the JSON..."). The output must be parsable by a standard JSON parser.""",
    output_key="generated_outline_json",
)

async def main_test():
    from google.adk.sessions import InMemorySessionService
    from google.adk.runners import Runner

    APP_NAME = "deck_architect_tool_app"
    USER_ID = "test_user_tool"
    SESSION_ID = "test_session_tool_456"

    db_connection_config = {
        "dbname": "chinook", 
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": 5432
    }
    # db_connection_config = {"dbname": "test_db_placeholder"} # For no DB testing

    deck_architect = DeckArchitectAgent(
        name="DeckArchitectAgent_Orchestrator_Tool",
        db_config=db_connection_config, # Pass db_config directly
        schema_summarizer=schema_summarizer_agent, # Pass the LlmAgent instance
        outline_generator=outline_generator_agent,
    )

    session_service = InMemorySessionService()
    initial_state_scenario = {
        "goal": "Analyze Q3 software bug reports",
        "context": "Engineering team meeting to prioritize fixes for Q4.",
        # "db_table_schemas": {} # Intentionally removed for tool to populate or use placeholder logic
    }
    
    if db_connection_config.get("dbname") == "test_db_placeholder":
        # For placeholder testing, provide initial schemas if DeckArchitectAgent expects them
        # or if _fetch_table_schemas_tool relies on this for its placeholder path.
        initial_state_scenario["db_table_schemas"] = {
             "bug_reports": {"bug_id": "integer", "severity": "text", "component": "text", "status": "text"},
             "developers": {"dev_id": "integer", "name": "text", "team": "text"}
        }

    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=initial_state_scenario
    )
    logger.info(f"Initial session state: {session.state}")

    runner = Runner(agent=deck_architect, app_name=APP_NAME, session_service=session_service)

    logger.info("\n--- Running DeckArchitectAgent Workflow with Schema Summarizer Tool ---")
    dummy_initial_message = genai_types.Content(role='user', parts=[genai_types.Part(text="Generate bug report analysis.")])
    events_generator = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=dummy_initial_message)

    async for event in events_generator:
        event_text = event.content.parts[0].text if event.content and event.content.parts else "No text content"
        logger.info(f"EVENT Author: {event.author}, Content: '{event_text}', Actions: {event.actions}")

    final_session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    print("\n--- Agent Interaction Result (Summarizer Tool Method) ---")
    if final_session:
        print("Final Session State:")
        print(json.dumps(final_session.state, indent=2, default=str))
        if final_session.state.get("generated_outline_json"):
            print("\nGenerated Presentation Outline available in final state.")
        else:
            print("\nNo final presentation outline found in session state.")
    else:
        print("No final session found.")
    print("-------------------------------\n")

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(main_test())
    except Exception as e:
        logger.error(f"Error running main_test: {e}", exc_info=True) 