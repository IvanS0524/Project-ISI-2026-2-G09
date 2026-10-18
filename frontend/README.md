# Frontend

Interfaz web estática de UniX Driver, organizada por responsabilidades para que la vista pueda crecer sin convertir `index.html` en un archivo monolítico.

## Estructura

```text
frontend/
├── index.html              # Estructura semántica y contenido de la página
└── assets/
    ├── css/
    │   └── styles.css      # Tokens, layout, componentes y responsive UI
    └── js/
        └── app.js          # Menú, navegación, tarifas y animaciones
```

## Ejecución local

Abre `index.html` directamente en el navegador o sirve la carpeta con cualquier servidor estático. No requiere build ni dependencias del frontend.
