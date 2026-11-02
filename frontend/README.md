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

## Publicación en GitHub Pages

El repositorio incluye el workflow `.github/workflows/deploy-pages.yml` para desplegar automáticamente el contenido de `frontend/` en GitHub Pages cuando hay cambios en `main` o `master`.

Si es la primera vez que se habilita Pages en el repositorio:

1. Ir a **Settings > Pages**.
2. En **Build and deployment**, seleccionar **Source: GitHub Actions**.

Luego de cada despliegue, GitHub publicará el sitio en la URL de Pages del repositorio.
