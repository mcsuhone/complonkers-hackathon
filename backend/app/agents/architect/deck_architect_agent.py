import logging
from typing import AsyncGenerator

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
    1. Fetch DB Schema (via DatabaseService).
    2. Summarize Schema (SchemaSummarizerAgent).
    3. Generate Themes with Content & Insights (ThemeAndContentGeneratorAgent).
    4. Assemble Final Outline.
    """
    db_service: DatabaseService
    schema_summarizer: LlmAgent
    theme_and_content_generator: LlmAgent # Renamed and repurposed

    model_config = {"arbitrary_types_allowed": True}

    def __init__(
        self,
        name: str,
        db_config: dict,
        schema_summarizer: LlmAgent,
        theme_and_content_generator: LlmAgent, # Renamed
    ):
        db_service = DatabaseService(db_config)
        sub_agents_list = [schema_summarizer, theme_and_content_generator]

        super().__init__(
            name=name,
            db_service=db_service,
            schema_summarizer=schema_summarizer,
            theme_and_content_generator=theme_and_content_generator,
            sub_agents=sub_agents_list,
        )

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        logger.info(f"[{self.name}] Starting presentation outline generation workflow.")

        goal = ctx.session.state.get("goal")
        context = ctx.session.state.get("context")

        if not goal or not context:
            logger.error(f"[{self.name}] Goal and Context must be provided in session state.")
            return

        table_schemas = {}
        db_conf = self.db_service.db_config
        if db_conf.get("dbname") and db_conf.get("dbname") not in ["your_db_name", "test_db_placeholder"]:
            try:
                logger.info(f"[{self.name}] Connecting to database...")
                async with self.db_service as db:
                    table_schemas = await db.get_table_schemas()
                logger.info(f"[{self.name}] Successfully fetched {len(table_schemas)} table schemas.")
                ctx.session.state["db_table_schemas"] = table_schemas
            except Exception as e:
                logger.error(f"[{self.name}] Error connecting to or fetching from DB: {e}")
                ctx.session.state["db_table_schemas"] = {}
        else:
            logger.info(f"[{self.name}] Using placeholder/no DB config. Schema will be empty or from initial state if provided.")
            table_schemas = ctx.session.state.get("db_table_schemas", {})

        if not table_schemas:
            logger.warning(f"[{self.name}] No database schemas found. Proceeding without schema-specific insights.")
            ctx.session.state["schema_summary"] = "No database schema was available for analysis."
        else:
            logger.info(f"[{self.name}] Running SchemaSummarizerAgent...")
            async for event in self.schema_summarizer.run_async(ctx):
                yield event
            if "schema_summary" not in ctx.session.state:
                logger.error(f"[{self.name}] SchemaSummarizerAgent failed to produce a summary.")
                ctx.session.state["schema_summary"] = "Failed to summarize schema."
        
        logger.info(f"[{self.name}] Running ThemeAndContentGeneratorAgent...")
        async for event in self.theme_and_content_generator.run_async(ctx):
            yield event
        
        generated_theme_contents_text = ctx.session.state.get("generated_theme_contents_text")
        if not generated_theme_contents_text:
            logger.error(f"[{self.name}] ThemeAndContentGeneratorAgent failed to generate theme contents.")
            return
        
        parsed_themes_with_content = self._parse_theme_contents(generated_theme_contents_text)
        ctx.session.state["parsed_themes_with_content"] = parsed_themes_with_content
        logger.info(f"[{self.name}] Generated and parsed {len(parsed_themes_with_content)} themes with content.")

        final_outline_slides = []
        slide_number_counter = 0

        slide_number_counter += 1
        final_outline_slides.append({
            "slide_number": slide_number_counter,
            "title": f"Presentation: {goal}",
            "content_description": f"Objective: {goal}. Context: {context}.",
            "data_insights": "Compelling opening statement or key statistic."
        })
        
        if len(parsed_themes_with_content) > 1:
            slide_number_counter += 1
            agenda_items_str = "\n".join([f"- {theme_content.get('title', 'Unnamed Theme')}" for theme_content in parsed_themes_with_content])
            final_outline_slides.append({
                "slide_number": slide_number_counter,
                "title": "Agenda / Presentation Roadmap",
                "content_description": f"This presentation will cover:\n{agenda_items_str}",
                "data_insights": "A clear guide for the audience."
            })

        for theme_content in parsed_themes_with_content:
            slide_number_counter += 1
            final_outline_slides.append({
                "slide_number": slide_number_counter,
                "title": theme_content.get("title", "Untitled Theme"),
                "content_description": theme_content.get("content_description", "Key discussion points for this theme."),
                "data_insights": theme_content.get("data_insights", "Relevant data or conceptual points.")
            })

        slide_number_counter += 1
        final_outline_slides.append({
            "slide_number": slide_number_counter, "title": "Summary of Key Insights",
            "content_description": "Consolidated overview of pivotal takeaways.",
            "data_insights": "Reiterate 2-3 main conclusions supported by analysis."
        })
        slide_number_counter += 1
        final_outline_slides.append({
            "slide_number": slide_number_counter, "title": "Recommendations & Next Steps",
            "content_description": "Actionable steps or proposals based on findings.",
            "data_insights": "Clear, measurable actions tied to objectives."
        })

        ctx.session.state["final_presentation_outline"] = final_outline_slides
        logger.info(f"[{self.name}] Workflow finished. Final outline generated with {len(final_outline_slides)} slides.")
        
        final_event_content = genai_types.Content(parts=[genai_types.Part(text=f"Outline generated with {len(final_outline_slides)} slides.")])
        yield Event(
            author=self.name, 
            content=final_event_content 
        )

    def _parse_theme_contents(self, text_blob: str) -> list[dict]:
        """
        Parses the structured string output from ThemeAndContentGeneratorAgent.
        Expected format per theme block:
        THEME_TITLE: Title Text
        CONTENT_DESCRIPTION: Description Text for the theme intro slide
        DATA_INSIGHTS: Data insights/suggestions for the theme
        (separated by "---")
        """
        themes = []
        theme_blocks = text_blob.strip().split("\n---\n")
        for block in theme_blocks:
            theme_data = {}
            lines = block.strip().split('\n')
            for line in lines:
                if line.startswith("THEME_TITLE:"):
                    theme_data["title"] = line.replace("THEME_TITLE:", "").strip()
                elif line.startswith("CONTENT_DESCRIPTION:"):
                    theme_data["content_description"] = line.replace("CONTENT_DESCRIPTION:", "").strip()
                elif line.startswith("DATA_INSIGHTS:"):
                    theme_data["data_insights"] = line.replace("DATA_INSIGHTS:", "").strip()
            if theme_data.get("title") and theme_data.get("content_description"):
                themes.append(theme_data)
        return themes


schema_summarizer_agent = LlmAgent(
    name="SchemaSummarizerAgent",
    model=MODEL_NAME,
    instruction="""You are a technical data analyst. Your specific task is to analyze the JSON representation of database table schemas provided in session state key 'db_table_schemas'.
Convert this JSON schema into a concise, natural language summary.
Focus ONLY on describing the likely purpose of each table and its key columns based on their names and structure.
Do NOT ask for more information about the presentation, product, or business goal.
Do NOT attempt to generate presentation themes or an outline yourself.
Your sole output should be this natural language summary of the database schema, which will be used by other specialized agents. Start directly with the summary.""",
    output_key="schema_summary",
)

# Renamed and repurposed agent
theme_and_content_generator_agent = LlmAgent(
    name="ThemeAndContentGeneratorAgent",
    model=MODEL_NAME,
    instruction="""You are a presentation content strategist.
Based on the presentation 'goal', 'context', AND the 'schema_summary' (a natural language summary of available database tables and columns) provided in session state,
identify 2-4 main themes or sections for a business presentation.
For EACH theme, provide:
1. THEME_TITLE: [A concise theme title. This will be a slide title.]
2. CONTENT_DESCRIPTION: [A brief 1-2 sentence overview for this theme slide, connecting to the goal and context.]
3. DATA_INSIGHTS: [1-2 sentences suggesting potential data points. Specifically reference table names or column concepts mentioned in the 'schema_summary' if they are relevant to this theme and the overall 'goal'. If schema_summary indicates no relevant data for a theme, suggest conceptual points or questions to address for that theme.]
Format each theme block exactly as specified. Separate each complete theme block (THEME_TITLE, CONTENT_DESCRIPTION, DATA_INSIGHTS) with a line containing only '---'.
Ensure your suggestions are directly tied to the provided 'goal', 'context', and utilize the information from 'schema_summary'. Do not ask for more information.
Example of one theme block given a schema_summary that mentioned 'customer_feedback' and 'sales_trends' tables:
THEME_TITLE: Understanding Customer Needs & Market Performance
CONTENT_DESCRIPTION: This section will analyze customer feedback and recent sales performance to identify key areas for the new product line.
DATA_INSIGHTS: Utilize insights from the 'customer_feedback' table to highlight desired features. Analyze 'sales_trends' to show market gaps the new product can fill.
""",
    output_key="generated_theme_contents_text",
)


async def main_test():
    from google.adk.sessions import InMemorySessionService
    from google.adk.runners import Runner
    import json

    APP_NAME = "deck_architect_simple_app"
    USER_ID = "test_user_simple"
    SESSION_ID = "test_session_simple_456"

    db_conf_placeholder = {
        "dbname": "test_db_placeholder",
        "user": "test_user", "password": "test_pass", "host": "localhost", "port": 5432
    }

    deck_architect = DeckArchitectAgent(
        name="DeckArchitectAgent_Orchestrator_Simple",
        db_config=db_conf_placeholder,
        schema_summarizer=schema_summarizer_agent,
        theme_and_content_generator=theme_and_content_generator_agent, # Updated
    )

    session_service = InMemorySessionService()
    initial_state_scenario = {
        "goal": "Launch new eco-friendly product line",
        "context": "Strategy meeting with marketing and product development teams.",
        "db_table_schemas": {
            "product_prototypes": {"prototype_id": "integer", "material_cost": "numeric", "sustainability_score": "float"},
            "market_research_surveys": {"survey_id": "integer", "target_audience": "text", "eco_awareness_rating": "integer"},
            "competitor_eco_products": {"competitor_name": "text", "product_range": "text", "price_point": "text"}
        }
    }

    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=initial_state_scenario
    )
    logger.info(f"Initial session state: {session.state}")

    runner = Runner(agent=deck_architect, app_name=APP_NAME, session_service=session_service)

    logger.info("\n--- Running Simplified DeckArchitectAgent Workflow ---")
    dummy_initial_message = genai_types.Content(role='user', parts=[genai_types.Part(text="Generate outline for new product line.")])
    events_generator = runner.run_async(user_id=USER_ID, session_id=SESSION_ID, new_message=dummy_initial_message)

    async for event in events_generator:
        logger.info(f"EVENT: {event.content}, 'Actions': {event.actions}")

    final_session = await session_service.get_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID)
    print("\n--- Agent Interaction Result (Simplified) ---")
    if final_session and final_session.state.get("final_presentation_outline"):
        print("Generated Presentation Outline:")
        print(json.dumps(final_session.state["final_presentation_outline"], indent=2))
    else:
        print("No final presentation outline found in session state.")
    
    print("\nFinal Session State (selected keys):")
    if final_session:
        selected_keys = ["goal", "context", "schema_summary", "parsed_themes_with_content", "final_presentation_outline"]
        filtered_state = {k: final_session.state.get(k) for k in selected_keys}
        print(json.dumps(filtered_state, indent=2, default=str))
    print("-------------------------------\n")

if __name__ == "__main__":
    import asyncio
    try:
        asyncio.run(main_test())
    except Exception as e:
        logger.error(f"Error running main_test: {e}", exc_info=True) 