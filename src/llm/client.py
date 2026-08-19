import base64

from langchain_ollama import ChatOllama

# Unica fuente de verdad de la URL por defecto del daemon local de Ollama --
# la reutiliza tambien `llm.model_catalog` para listar modelos instalados,
# asi ambos módulos apuntan siempre al mismo Ollama sin duplicar el literal
# (003-ui-polish-model-switch).
DEFAULT_BASE_URL = "http://localhost:11434"


class OllamaClient:
    """Cliente delgado sobre la API local de Ollama, vía LangChain."""

    def __init__(self, model_name: str = "qwen2.5:7b-instruct", base_url: str = DEFAULT_BASE_URL):
        """
        Parameters
        ----------
        model_name : str
            Modelo de Ollama a usar (debe estar ya descargado, ej. con
            `ollama pull <model_name>`). Para poder recibir imágenes en
            `chat`, debe ser un modelo multimodal.
        base_url : str
            URL del daemon local de Ollama.
        """
        self.model_name = model_name
        self.base_url = base_url
        self.client = ChatOllama(model=model_name, base_url=base_url, temperature=0)

    def chat(self, system_prompt: str, user_message: str, images: list[bytes] | None = None) -> str:
        """
        Envía un mensaje de sistema + usuario al modelo y devuelve su
        respuesta como texto. Si se pasan `images`, se adjuntan al mensaje
        de usuario como bloques `image_url` en base64 (requiere un modelo
        multimodal; con un modelo solo de texto, Ollama las ignora).

        Parameters
        ----------
        system_prompt : str
            Instrucciones de sistema (reglas de corrección, formato, etc.).
        user_message : str
            El mensaje de usuario (ej. el documento OCR).
        images : list[bytes] | None
            Bytes crudos de cada imagen a adjuntar, en orden.

        Returns
        -------
        str
            El texto de la respuesta del modelo.
        """
        human_content = [{"type": "text", "text": user_message}]
        for image_bytes in images or []:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            human_content.append({
                "type": "image_url",
                "image_url": f"data:image/jpeg;base64,{b64}",
            })

        response = self.client.invoke([
            ("system", system_prompt),
            ("human", human_content),
        ])
        return response.content