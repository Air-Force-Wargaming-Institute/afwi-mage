#!/usr/bin/env python3
# vLLM Chat API Load Testing Script

import asyncio
import argparse
import time
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse command line arguments
parser = argparse.ArgumentParser(description='Test vLLM OpenAI-compatible Chat API')
parser.add_argument('--message-count', type=int, default=200, help='Number of messages to send')
parser.add_argument('--endpoint', type=str, default="http://vllm:8000/v1/chat/completions", help='API endpoint URL')
parser.add_argument('--model', type=str, default="/models/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2", help='Model path or name')
parser.add_argument('--max-concurrent', type=int, default=200, help='Maximum concurrent requests')
args = parser.parse_args()

# List of 100 diverse user messages for testing with different subject areas
USER_MESSAGES = [
    # Technology & AI
    "What are three key benefits of artificial intelligence?",
    "How does machine learning differ from traditional programming?",
    "Explain the concept of neural networks in simple terms.",
    "What ethical concerns should we consider when deploying AI systems?",
    "How is natural language processing used in modern applications?",
    "What is the difference between supervised and unsupervised learning?",
    "Describe how reinforcement learning works with an example.",
    "What are the limitations of current AI technology?",
    "How might AI impact the job market in the next decade?",
    "What are some practical applications of computer vision?",
    "Explain the concept of quantum computing to a beginner.",
    "How does blockchain technology ensure security?",
    "What is edge computing and why is it important?",
    "How do recommendation systems work on streaming platforms?",
    "What are the key differences between 5G and previous cellular technologies?",
    "How are robotics being used in healthcare?",
    "What are the main challenges in cybersecurity today?",
    "How do autonomous vehicles navigate their environment?",
    "What is the Internet of Things (IoT) and its applications?",
    "How does facial recognition technology work?",

    # Science
    "Explain the theory of relativity in simple terms.",
    "How do vaccines work to protect against diseases?",
    "What is CRISPR technology and its potential applications?",
    "How do black holes form and evolve?",
    "Explain the process of photosynthesis.",
    "What is dark matter and why is it important in astrophysics?",
    "How does climate change affect biodiversity?",
    "What is the human microbiome and why is it significant?",
    "How do earthquakes occur and how are they measured?",
    "What are the major differences between RNA and DNA?",
    "Explain how nuclear fusion works.",
    "How do neurons transmit information in the brain?",
    "What is the Standard Model in particle physics?",
    "How do coral reefs form and why are they important ecosystems?",
    "What is quantum entanglement?",
    "How do antibiotics work against bacterial infections?",
    "Explain the water cycle and its importance to Earth's ecosystems.",
    "What is the theory of plate tectonics?",
    "How do MRI machines create images of the human body?",
    "What are exoplanets and how do scientists detect them?",

    # Business & Economics
    "What are the key principles of effective leadership?",
    "How does supply and demand influence market prices?",
    "What is the difference between microeconomics and macroeconomics?",
    "Explain the concept of compound interest.",
    "What are the advantages and disadvantages of different business structures?",
    "How do central banks control inflation?",
    "What is disruptive innovation with some examples?",
    "Explain the concept of opportunity cost.",
    "What are the key components of a successful business plan?",
    "How does cryptocurrency differ from traditional currency?",
    "What is the gig economy and how is it changing work?",
    "Explain the concept of comparative advantage in international trade.",
    "What are ESG investments and why are they gaining popularity?",
    "How do stock markets function?",
    "What are the major causes of economic recessions?",
    "Explain the principle of diminishing returns.",
    "What is venture capital and how does it support startups?",
    "How do companies determine optimal pricing strategies?",
    "What is the difference between monetary and fiscal policy?",
    "How do mergers and acquisitions change industry dynamics?",

    # Arts & Humanities
    "How did the Renaissance period influence modern art?",
    "What are the major themes in Shakespeare's tragedies?",
    "Explain the differences between classical and jazz music.",
    "How has filmmaking evolved over the past century?",
    "What are the key characteristics of Gothic architecture?",
    "How did Impressionism change the art world?",
    "What is magical realism in literature?",
    "How does cultural context influence artistic expression?",
    "What is the significance of mythology in ancient civilizations?",
    "How has digital technology transformed the creation of art?",
    "Explain the concept of existentialism in philosophy.",
    "What are the major differences between Eastern and Western philosophy?",
    "How did the Bauhaus movement influence modern design?",
    "What is the role of symbolism in visual arts?",
    "How has dance evolved as a form of cultural expression?",
    "What is postmodernism and its impact on contemporary art?",
    "How do different cultures approach the concept of beauty?",
    "What is the significance of oral traditions in preserving history?",
    "How has poetry evolved across different time periods?",
    "What is the relationship between art and political movements?",

    # History & Society
    "What were the main causes of World War II?",
    "How did the Industrial Revolution change society?",
    "What factors led to the fall of the Roman Empire?",
    "How has the concept of human rights evolved over time?",
    "What was the significance of the Silk Road in ancient trade?",
    "How did the Cold War shape international relations?",
    "What were the key achievements of ancient Egyptian civilization?",
    "How did colonialism impact indigenous populations?",
    "What were the major outcomes of the Civil Rights Movement?",
    "How has urbanization changed societies around the world?",
    "What were the key innovations of the Scientific Revolution?",
    "How did the printing press change the spread of knowledge?",
    "What was daily life like in medieval Europe?",
    "How have patterns of migration shaped modern societies?",
    "What were the causes and effects of the Great Depression?",
    "How did the Age of Exploration change global connections?",
    "What was the impact of the Agricultural Revolution on human societies?",
    "How has the role of women changed throughout history?",
    "What were the main philosophical ideas behind the Enlightenment?",
    "How did ancient Mesopotamian civilization contribute to human progress?",

    # Psychology & Health
    "What are the main theories of personality development?",
    "How does chronic stress affect physical health?",
    "What is cognitive behavioral therapy and how does it work?",
    "Explain the different stages of sleep and their functions.",
    "How do vaccines create herd immunity?",
    "What is the relationship between diet and mental health?",
    "How does the placebo effect work?",
    "What are the psychological effects of social media use?",
    "How do habits form and what are effective strategies to change them?",
    "What is mindfulness meditation and its benefits?",
    "How does memory work and why do we forget things?",
    "What are the different types of cognitive biases?",
    "How does exercise impact brain function?",
    "What is the gut-brain connection?",
    "How do different parenting styles affect child development?",
    "What are the psychological factors behind decision-making?",
    "How does aging affect cognitive abilities?",
    "What is emotional intelligence and why is it important?",
    "How do cultural differences influence perception?",
    "What are effective strategies for managing anxiety?"
]

async def send_request(client: httpx.AsyncClient, request_data: Dict, message_number: int, message: str) -> Dict[str, Any]:
    """Send a request to the vLLM API and return the response with timing information."""
    start_time = time.time()
    
    try:
        response = await client.post(args.endpoint, json=request_data)
        response_data = response.json()
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        return {
            "success": True,
            "message_number": message_number,
            "query": message,
            "response": response_data["choices"][0]["message"]["content"],
            "elapsed_ms": elapsed_ms,
            "full_response": response_data
        }
    except Exception as e:
        return {
            "success": False,
            "message_number": message_number,
            "query": message,
            "error_message": str(e),
            "elapsed_ms": 0,
            "full_response": None
        }

async def main() -> None:
    print("\033[96mTesting vLLM OpenAI-compatible Chat API (Async Mode)...\033[0m")
    print(f"\033[96mWill send {args.message_count} messages to the vLLM API\033[0m")
    print(f"\033[96mUsing endpoint: {args.endpoint}\033[0m")
    print(f"\033[96mUsing model: {args.model}\033[0m")
    print(f"\033[96mMaximum concurrent requests: {args.max_concurrent}\033[0m")
    print(f"\033[96mUsing {len(USER_MESSAGES)} unique diverse questions\033[0m")
    
    # Create limits for httpx client
    limits = httpx.Limits(max_connections=args.max_concurrent)
    
    # Prepare all request payloads and task parameters before timing
    print("Preparing requests...")
    request_data_list = []
    
    for i in range(args.message_count):
        message_index = i % len(USER_MESSAGES)
        current_message = USER_MESSAGES[message_index]
        message_num = i + 1
        
        payload = {
            "model": args.model,
            "messages": [
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": current_message}
            ],
            "max_tokens": 250,
            "temperature": 0.7,
            "stream": False
        }
        
        request_data_list.append((payload, message_num, current_message))
        
        # Just show progress without printing every message
        if i % 20 == 0 or i == args.message_count - 1:
            print(f"Prepared {i+1}/{args.message_count} requests...")
    
    # Print distribution of message categories in test
    if args.message_count <= len(USER_MESSAGES):
        print("\nMessage distribution by category:")
        print("- Technology & AI: {} messages".format(min(20, args.message_count)))
        if args.message_count > 20:
            print("- Science: {} messages".format(min(20, args.message_count - 20)))
        if args.message_count > 40:
            print("- Business & Economics: {} messages".format(min(20, args.message_count - 40)))
        if args.message_count > 60:
            print("- Arts & Humanities: {} messages".format(min(20, args.message_count - 60)))
        if args.message_count > 80:
            print("- History & Society: {} messages".format(min(20, args.message_count - 80)))
    else:
        print("\nAll message categories will be used and repeated.")
    
    # Create a reusable client
    async with httpx.AsyncClient(timeout=60.0, limits=limits) as client:
        # Create all the tasks but don't await them yet
        tasks = [
            send_request(client, payload, message_num, message)
            for payload, message_num, message in request_data_list
        ]
        
        print(f"\nAll {args.message_count} requests prepared. Starting timed execution...")
        
        # Start timer right before sending all requests
        start_time = time.time()
        
        # Execute all requests and gather responses
        all_responses = await asyncio.gather(*tasks)
        
        # Stop timer immediately after all responses are received
        end_time = time.time()
    
    total_time_ms = int((end_time - start_time) * 1000)
    
    # Process and display results
    successful_responses = [r for r in all_responses if r["success"]]
    failed_responses = [r for r in all_responses if not r["success"]]
    
    # Sort responses by message number
    all_responses.sort(key=lambda x: x["message_number"])
    
    # Display summary first
    print("\n\033[92m=== PERFORMANCE SUMMARY ===\033[0m")
    print(f"\033[92mTotal API call time: {total_time_ms / 1000:.2f} seconds ({total_time_ms} ms)\033[0m")
    print(f"\033[92mMessages sent: {args.message_count}\033[0m")
    print(f"\033[92mSuccessful responses: {len(successful_responses)}\033[0m")
    print(f"\033[92mFailed responses: {len(failed_responses)}\033[0m")
    
    if successful_responses:
        avg_response_time = sum(r["elapsed_ms"] for r in successful_responses) / len(successful_responses)
        min_response_time = min(r["elapsed_ms"] for r in successful_responses)
        max_response_time = max(r["elapsed_ms"] for r in successful_responses)
        
        print(f"\033[92mAverage response time: {avg_response_time:.2f} ms\033[0m")
        print(f"\033[92mMinimum response time: {min_response_time} ms\033[0m")
        print(f"\033[92mMaximum response time: {max_response_time} ms\033[0m")
    
    print(f"\033[92mThroughput: {args.message_count / (total_time_ms / 1000):.2f} requests/second\033[0m")
    
    # Display some sample responses
    print("\n\033[96m=== SAMPLE RESPONSES (first 5) ===\033[0m")
    for result in all_responses[:5]:
        print(f"\n\033[93m--- MESSAGE {result['message_number']} ---\033[0m")
        print(f"\033[90mQuery: {result['query']}\033[0m")
        print(f"\033[90mResponse time: {result['elapsed_ms']}ms\033[0m")
        print("\033[97mResponse:\033[0m")
        print(result["response"] if result["success"] else f"ERROR: {result['error_message']}")
    
    # Ask if user wants to see all results
    print("\n\033[93mDo you want to see all responses? (y/n)\033[0m")
    show_all = input().strip().lower() == 'y'
    
    if show_all:
        print("\n\033[96m=== ALL RESPONSES ===\033[0m")
        for result in all_responses:
            print(f"\n\033[93m--- MESSAGE {result['message_number']} ---\033[0m")
            print(f"\033[90mQuery: {result['query']}\033[0m")
            print(f"\033[90mResponse time: {result['elapsed_ms']}ms\033[0m")
            print("\033[97mResponse:\033[0m")
            print(result["response"] if result["success"] else f"ERROR: {result['error_message']}")
    
    # Analyze response times by category
    if successful_responses:
        print("\n\033[96m=== ANALYSIS BY CATEGORY ===\033[0m")
        
        categories = [
            ("Technology & AI", 0, 20),
            ("Science", 20, 40),
            ("Business & Economics", 40, 60),
            ("Arts & Humanities", 60, 80),
            ("History & Society", 80, 100)
        ]
        
        category_stats = {}
        
        for cat_name, start_idx, end_idx in categories:
            cat_responses = [r for r in successful_responses if start_idx <= USER_MESSAGES.index(r["query"]) % len(USER_MESSAGES) < end_idx]
            
            if cat_responses:
                avg_time = sum(r["elapsed_ms"] for r in cat_responses) / len(cat_responses)
                category_stats[cat_name] = {
                    "count": len(cat_responses),
                    "avg_time": avg_time,
                    "min_time": min(r["elapsed_ms"] for r in cat_responses),
                    "max_time": max(r["elapsed_ms"] for r in cat_responses)
                }
                
                print(f"\033[93m{cat_name}\033[0m:")
                print(f"  Requests: {len(cat_responses)}")
                print(f"  Avg response time: {avg_time:.2f} ms")
                print(f"  Min response time: {category_stats[cat_name]['min_time']} ms")
                print(f"  Max response time: {category_stats[cat_name]['max_time']} ms")
    
    # Save results to a file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"vllm_test_results_{timestamp}.json"
    with open(results_file, "w") as f:
        # Function to safely determine category
        def get_category(query):
            try:
                message_index = USER_MESSAGES.index(query) % len(USER_MESSAGES)
                for cat_name, start_idx, end_idx in categories:
                    if start_idx <= message_index < end_idx:
                        return cat_name
                return "Uncategorized"  # Fallback if not in expected range
            except ValueError:  # If query not in USER_MESSAGES
                # Determine based on content keywords
                if any(kw in query.lower() for kw in ["ai", "neural", "machine learning", "technology"]):
                    return "Technology & AI"
                elif any(kw in query.lower() for kw in ["science", "biology", "physics", "chemistry"]):
                    return "Science"
                elif any(kw in query.lower() for kw in ["business", "economy", "market", "finance"]):
                    return "Business & Economics"
                elif any(kw in query.lower() for kw in ["art", "literature", "music", "philosophy"]):
                    return "Arts & Humanities"
                elif any(kw in query.lower() for kw in ["history", "civilization", "society", "revolution"]):
                    return "History & Society"
                elif any(kw in query.lower() for kw in ["psychology", "health", "therapy", "mental"]):
                    return "Psychology & Health"
                return "Uncategorized"
            except Exception:
                return "Uncategorized"  # Catch any other errors
        
        json.dump({
            "test_parameters": {
                "message_count": args.message_count,
                "endpoint": args.endpoint,
                "model": args.model,
                "max_concurrent": args.max_concurrent,
                "unique_messages": len(USER_MESSAGES)
            },
            "performance": {
                "total_time_ms": total_time_ms,
                "avg_response_time": avg_response_time if successful_responses else 0,
                "min_response_time": min_response_time if successful_responses else 0,
                "max_response_time": max_response_time if successful_responses else 0,
                "throughput": args.message_count / (total_time_ms / 1000) if total_time_ms > 0 else 0,
                "category_stats": category_stats if successful_responses else {}
            },
            "responses": [
                {
                    "message_number": r["message_number"],
                    "query": r["query"],
                    "category": get_category(r["query"]),
                    "response": r["response"] if r["success"] else f"ERROR: {r['error_message']}",
                    "elapsed_ms": r["elapsed_ms"],
                    "success": r["success"]
                }
                for r in all_responses
            ]
        }, f, indent=2)
    print(f"\nResults saved to {results_file}")

if __name__ == "__main__":
    asyncio.run(main())