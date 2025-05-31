from os import getenv

from google.adk import Agent

interpreter_agent = Agent(
    name="interpreter",
    model="gemini-2.0-flash",
    
)