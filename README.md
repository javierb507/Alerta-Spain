
# 🚨 Monitor de Emergencias España v2.0 (Masterpiece Version)

**Última actualización:** 11 de Mayo, 2026 - 13:20 CEST

Sistema avanzado de inteligencia situacional diseñado para la monitorización de emergencias y sucesos en el territorio español. Impulsado por la arquitectura multimodal de **Google Gemini 3**.

## 🌲 El Origen: Por qué existe este proyecto
Todo surgió durante un paseo por **Alcalá de Henares**. Mientras caminaba por el campo cerca del río, vi un camión de bomberos y un helicóptero despegando. En ese momento de incertidumbre, intenté buscar información en tiempo real desde mi móvil para saber qué estaba pasando y si había algún peligro cercano, pero fue imposible encontrar una fuente centralizada que informara de incidentes tan localizados en el acto.

Me di cuenta de que, aunque existen muchas herramientas de respuesta a emergencias, la información suele estar dispersa y no es lo suficientemente concreta para sitios pequeños o eventos muy específicos en un radio cercano.

**Monitor de Emergencias** nace para solucionar eso: permitir que cualquier persona pueda buscar en un radio de kilómetros determinado si hay algún incidente reportado, unificando en un solo lugar alertas de fuentes locales, redes sociales, el 112, Protección Civil y la DGT.

## 🚀 Despliegue en Producción
La aplicación se encuentra activa en:
[https://alerta-local-espa-a-249485768002.us-west1.run.app/](https://alerta-local-espa-a-249485768002.us-west1.run.app/)

## 🧠 Cómo funciona: El Motor de Inteligencia

Este sistema no utiliza una base de datos estática; en su lugar, emplea una **Arquitectura de IA en Dos Fases** para garantizar que la información sea real y esté actualizada al minuto:

### Fase 1: Percepción y Grounding (Google Search)
El sistema utiliza el modelo **Gemini 3 Flash** con la herramienta de búsqueda de Google. Este modelo escanea activamente la web buscando:
- **Fuentes Oficiales**: AEMET (Meteo), DGT (Tráfico), Renfe/ADIF (Transporte), y servicios de emergencia 112.
- **Señales Sociales**: Reportes ciudadanos y noticias de última hora en prensa local y nacional.

### Fase 2: Análisis Crítico y Estructuración (JSON Schema)
Una vez recolectada la información bruta, el modelo **Gemini 3 Pro** realiza un análisis forense de los datos para:
1.  **Deduplicar**: Eliminar reportes redundantes de la misma emergencia.
2.  **Clasificar Severidad**: Asignar niveles (CRITICAL, WARNING, INFO) basados en el riesgo real para la vida y la propiedad.
3.  **Mapeo de Fuentes**: Vincular cada alerta con su URL de origen verificada para evitar alucinaciones de la IA.
4.  **Resumen Ejecutivo**: Generar un análisis de riesgo textual para el usuario.

## 🛠️ Características Principales

- **Dashboard Táctico**: Interfaz inspirada en centros de mando militares, optimizada para la legibilidad bajo estrés.
- **Audio de Grado Profesional**: Feedback auditivo mediante **Web Audio API** para alertar al usuario de cambios críticos sin necesidad de mirar la pantalla.
- **Modo Monitor Activo**: El sistema puede configurarse para refrescarse automáticamente cada 60 segundos, enviando notificaciones del navegador si se detectan nuevas amenazas.
- **Filtros Inteligentes**: Capacidad de filtrar por radio (km), categorías específicas (Incendios, Clima, Transporte) o fechas históricas.
- **Fuentes Personalizadas**: Los usuarios avanzados pueden añadir URLs específicas para que la IA las monitorice prioritariamente.

## 📦 Instalación y Configuración Local

1.  **Requisitos**: [Node.js](https://nodejs.org/) (v18+).
2.  **Clonar**: `git clone https://github.com/javierb507/Alerta-espa-a.git`
3.  **Dependencias**: `npm install`
4.  **Clave de API**: Crea un archivo `.env` con `GEMINI_API_KEY=tu_clave`.
5.  **Ejecutar**: `npm run dev`

---
### ⚖️ Descargo de Responsabilidad (Disclaimer)
*Esta aplicación es un agregador de información basado en Inteligencia Artificial. Aunque se priorizan fuentes oficiales, los datos pueden tener retrasos o errores de interpretación. No sustituye en ningún caso a los canales de comunicación oficiales del Estado. **En caso de emergencia real, llame siempre al 112.***
