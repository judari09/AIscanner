# `llm`

Cliente de Ollama, prompt de sistema y estructuración del resultado OCR en Markdown. Ver
[Pipeline](../architecture/pipeline.md#3-estructuración-con-llm-llm).

## `llm.client`

::: llm.client

## `llm.model_catalog`

::: llm.model_catalog

## `llm.prompts`

Solo se documenta `build_user_message` aquí — `SYSTEM_PROMPT` es la constante con las reglas
completas del prompt de sistema; su contenido íntegro está en
[`src/llm/prompts.py`](https://github.com/judari09/AIscanner/blob/develop/src/llm/prompts.py) y se
resume en [Pipeline](../architecture/pipeline.md#3-estructuración-con-llm-llm).

::: llm.prompts
    options:
      members:
        - build_user_message

## `llm.structuring`

::: llm.structuring
