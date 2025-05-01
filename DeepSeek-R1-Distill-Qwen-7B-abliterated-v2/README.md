---
base_model:
- deepseek-ai/DeepSeek-R1-Distill-Qwen-7B
library_name: transformers
tags:
- abliterated
- uncensored
---

# huihui-ai/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2


This is an uncensored version of [deepseek-ai/DeepSeek-R1-Distill-Qwen-7B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B) created with abliteration (see [remove-refusals-with-transformers](https://github.com/Sumandora/remove-refusals-with-transformers) to know more about it).  
This is a crude, proof-of-concept implementation to remove refusals from an LLM model without using TransformerLens.    

If "\<think\>" does not appear or refuses to respond, you can first provide an example to guide, and then ask your question.   
For instance:

```
  How many 'r' characters are there in the word "strawberry"?
```

**Important Note** This version is an improvement over the previous one [huihui-ai/DeepSeek-R1-Distill-Qwen-7B-abliterated](https://huggingface.co/huihui-ai/DeepSeek-R1-Distill-Qwen-7B-abliterated).

## Use with ollama

You can use [huihui_ai/deepseek-r1-abliterated](https://ollama.com/huihui_ai/deepseek-r1-abliterated) directly
```
ollama run huihui_ai/deepseek-r1-abliterated:7b
```
### Donation
##### Your donation helps us continue our further development and improvement, a cup of coffee can do it.
- bitcoin:
```
  bc1qqnkhuchxw0zqjh2ku3lu4hq45hc6gy84uk70ge
```
