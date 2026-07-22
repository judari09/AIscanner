from ocr.preprocess import preprocess_image
from paddleocr import PaddleOCR

class OCREngine:
    """Envoltorio delgado sobre PaddleOCR para extraer texto de manuscritos."""

    def __init__(self):
        """
        Inicializa el motor de PaddleOCR con el modelo de idioma `es` (script
        latino, cubre español + inglés mezclados) y sin los modelos
        auxiliares de orientación/desenrollado de documento, que no aportan
        para fotos de notas ya razonablemente derechas.
        """
        # Initialize the PaddleOCR engine
        self.ocr = PaddleOCR(
                use_doc_orientation_classify=False, # Disables document orientation classification model via this parameter
                use_doc_unwarping=False, # Disables text image rectification model via this parameter
                use_textline_orientation=False, # Disables text line orientation classification model via this parameter
                lang="es"  # Modelo de script latino: cubre español + inglés mezclados
            )
    def perform_ocr(self, image_path):
        """
        Perform OCR on the input image.

        Args:
            image_path (str): Path to the input image.

        Returns:
            El resultado crudo de `PaddleOCR.predict`: una lista con un
            objeto por imagen de entrada (aquí siempre una, ya que se llama
            con una sola imagen); cada objeto es indexable como dict y
            expone entre otras claves `rec_texts` (líneas de texto
            reconocidas, en orden de lectura) y `rec_scores` (confianza por
            línea).
        """
        # Preprocess the image
        preprocessed_image = preprocess_image(image_path)

        # Perform OCR using PaddleOCR
        result = self.ocr.predict(preprocessed_image)

        return result
    
    
if __name__ == "__main__":
    # Example usage
    image_path = r"prueba\2.jpeg"
    ocr_engine = OCREngine()
    ocr_result = ocr_engine.perform_ocr(image_path)
    print(ocr_result[0]["rec_texts"])