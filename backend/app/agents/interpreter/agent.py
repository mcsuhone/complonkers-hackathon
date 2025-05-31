from google.adk.agents import LlmAgent

job_interpreter_agent = LlmAgent(
    name="JobInterpreterAgent",
    model="gemini-2.0-flash-001",
    instruction="""You are a job interpreter. You will receive a 'prompt' (user's request) and 'audiences' (list of target audiences) in session state.
Your task is to:
1. Provide a concise summary of what the user wants to achieve.
2. Create a JSON object 'job_plan' with two fields:
   - 'interpretation': your summary of the user's intent.
   - 'audience_strategies': a mapping from each audience to a brief description of how to tailor the presentation for that audience.
Return only the JSON object.""",
    output_key="job_plan",
)