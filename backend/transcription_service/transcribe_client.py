# import requests
# import os

# # Configuration
# SERVICE_URL = "http://localhost:8021/api/transcription/"
# #FILE_NAME = "Barack Obama Speech 2004.mp3"
# #FILE_PATH = os.path.join(os.path.dirname(__file__), FILE_NAME)

# def transcribe_file(file_path):
#     """Sends an audio file to the transcription service and saves the result to a text file."""
#     if not os.path.exists(file_path):
#         print(f"Error: File not found at {file_path}")
#         return

#     base_name = os.path.basename(file_path)
#     output_filename = os.path.splitext(base_name)[0] + ".txt"
#     output_path = os.path.join(os.path.dirname(file_path), output_filename)

#     print(f"Sending {base_name} to {SERVICE_URL} for transcription...")

#     response = None # Initialize response to handle potential connection errors
#     try:
#         with open(file_path, 'rb') as f:
#             files = {
#                 # The key 'file' must match the parameter name in the FastAPI endpoint
#                 'file': (base_name, f, 'audio/mpeg')
#             }
#             response = requests.post(SERVICE_URL, files=files, timeout=300) # 5 min timeout

#         response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

#         result = response.json()
#         transcription_text = result.get('transcription', 'Error: No transcription found in response.')

#         # Save the transcription to a file
#         try:
#             with open(output_path, 'w', encoding='utf-8') as outfile:
#                 outfile.write(transcription_text)
#             print(f"\nTranscription successfully saved to: {output_path}")
#         except IOError as e:
#             print(f"\nError: Could not write transcription to file {output_path}: {e}")
#             # Optionally print to console as fallback
#             print("\n--- Transcription Result (Console Fallback) ---")
#             print(f"Filename: {result.get('filename')}")
#             print(f"Transcription: {transcription_text}")
#             print("--------------------------------------------")

#     except requests.exceptions.ConnectionError as e:
#         print(f"\nError: Could not connect to the transcription service at {SERVICE_URL}")
#         print("Please ensure the service is running via docker-compose.")
#         print(f"Details: {e}")
#     except requests.exceptions.Timeout:
#         print("\nError: The request timed out. The transcription might be taking too long.")
#     except requests.exceptions.RequestException as e:
#         print(f"\nError during request: {e}")
#         if response is not None:
#             print(f"Status Code: {response.status_code}")
#             try:
#                 print(f"Response Body: {response.json()}")
#             except requests.exceptions.JSONDecodeError:
#                 print(f"Response Body: {response.text}") # Print raw text if not JSON
#     except Exception as e:
#         print(f"\nAn unexpected error occurred: {e}")

# # if __name__ == "__main__":
# #     transcribe_file(FILE_PATH) 