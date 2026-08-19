import cv2


def preprocess_image(image_path):
    """
    Preprocesa la imagen de entrada para el OCR.

    Convierte la imagen a escala de grises (y de vuelta a BGR, que es lo que
    espera PaddleOCR) para normalizar el color antes del reconocimiento. Se
    evita deliberadamente cualquier binarizado/threshold agresivo: se probó
    y empeoraba la detección de texto en vez de ayudarla, ya que los modelos
    de PaddleOCR están entrenados sobre fotos de documentos "normales", no
    sobre imágenes binarizadas e invertidas.

    Parameters
    ----------
    image_path : str
        Ruta de la imagen de entrada.

    Returns
    -------
    numpy.ndarray
        La imagen preprocesada como array de OpenCV (BGR), lista para
        pasarse a `PaddleOCR.predict`.

    Raises
    ------
    FileNotFoundError
        Si `image_path` no existe o no se puede leer como imagen.
    """
    # Read the image
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(
            f"No se pudo leer la imagen: {image_path!r} (¿existe la ruta? ¿es un formato válido?)"
        )

    # Convert to grayscale
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    image = cv2.cvtColor(gray_image, cv2.COLOR_GRAY2BGR)

    cv2.imwrite("preprocessed_image.jpg", image)  # Save the preprocessed image for debugging
    return image