# AI connection settings

Add an AI connection section under Settings for the RestoPusula owner. Support OpenAI, Google Gemini and Anthropic Claude with provider, model ID and API key inputs. One connection per business. Saving and removing require the existing owner session and CSRF token. Keys remain encrypted on the server and never appear in API responses, business exports, audit messages or browser storage.

The owner can test access to the saved model through the provider's official model metadata endpoint. No prompts, restaurant records or generation requests are sent. Provider URLs are fixed. A blank key preserves an existing key only when the provider is unchanged; changing model or credentials clears the previous test result. Provider changes require a new key. Failed tests clear the previous successful status and show a safe, useful error.

The existing rule-based management assistant remains unchanged. The public, serverless preview exposes the new section and provider/model controls but disables API key entry and save/test/remove actions with a clear explanation. Keep all current business flows working and support 360–1440 px widths. The local administrator ZIP backup includes the encryption key for restore; the owner JSON export never does.
