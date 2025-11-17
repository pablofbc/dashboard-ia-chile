# Dashboard IA Web

Este es un proyecto de dashboard interactivo construido con Next.js, TypeScript y Tailwind CSS. La aplicación muestra datos de una manera visualmente atractiva e interactiva.

## Características

*   **Dashboard Interactivo:** Visualización de datos con componentes interactivos.
*   **Diseño Moderno:** Interfaz de usuario moderna y receptiva construida con Tailwind CSS y shadcn/ui.
*   **Componentes Reutilizables:** Una biblioteca de componentes de interfaz de usuario reutilizables en `components/ui`.
*   **Internacionalización:** Soporte para múltiples idiomas (inglés y español) usando `i18next`.
*   **Renderizado del Lado del Servidor (SSR):** Aprovecha Next.js para un rendimiento rápido y optimización SEO.

## Empezando

Estas instrucciones te permitirán obtener una copia del proyecto en funcionamiento en tu máquina local para fines de desarrollo y prueba.

### Prerrequisitos

Asegúrate de tener Node.js y pnpm (o npm/yarn) instalados en tu sistema.

*   [Node.js](https://nodejs.org/) (versión 18 o superior)
*   [pnpm](https://pnpm.io/installation) (recomendado)

### Instalación

1.  Clona el repositorio:
    ```bash
    git clone https://gitlab.com/juliansoria18/dashboard.ia.web.git
    cd dashboard.ia.web
    ```

2.  Instala las dependencias del proyecto:
    ```bash
    pnpm install
    ```

## Scripts Disponibles

En el directorio del proyecto, puedes ejecutar:

*   `pnpm dev`: Inicia la aplicación en modo de desarrollo. Abre [http://localhost:3000](http://localhost:3000) para verla en tu navegador. La página se recargará si realizas cambios.

*   `pnpm build`: Construye la aplicación para producción en la carpeta `.next`.

*   `pnpm start`: Inicia un servidor de producción. Debes ejecutar `pnpm build` antes.

*   `pnpm lint`: Ejecuta el linter de Next.js para identificar y solucionar problemas en el código.

## Estructura del Proyecto

```
.
├── app/                # Directorio principal de la aplicación (App Router)
│   ├── api/            # Rutas de la API
│   ├── components/     # Componentes específicos de la página
│   ├── globals.css     # Estilos globales
│   └── layout.tsx      # Diseño principal de la aplicación
│   └── page.tsx        # Página de inicio
├── components/         # Componentes de UI reutilizables (shadcn/ui)
├── public/             # Archivos estáticos (imágenes, fuentes, etc.)
├── lib/                # Funciones de utilidad y helpers
├── locales/            # Archivos de traducción (i18n)
├── next.config.mjs     # Archivo de configuración de Next.js
├── package.json        # Dependencias y scripts del proyecto
└── tsconfig.json       # Configuración de TypeScript
```

## Tecnologías Utilizadas

*   [Next.js](https://nextjs.org/) - El framework de React para producción.
*   [React](https://reactjs.org/) - Una biblioteca de JavaScript para construir interfaces de usuario.
*   [TypeScript](https://www.typescriptlang.org/) - Un superconjunto de JavaScript que añade tipado estático.
*   [Tailwind CSS](https://tailwindcss.com/) - Un framework de CSS de utilidad primero.
*   [shadcn/ui](https://ui.shadcn.com/) - Componentes de UI bellamente diseñados.
*   [i18next](https://www.i18next.com/) - Un framework de internacionalización.
*   [Recharts](https://recharts.org/) - Una biblioteca de gráficos componible construida sobre componentes de React.


## Licencia

Este proyecto está licenciado bajo la Licencia MIT.