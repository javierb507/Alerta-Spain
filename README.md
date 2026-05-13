
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
- **Progressive Web App (PWA)**: Instalable en dispositivos móviles y escritorio como una aplicación nativa, con soporte básico para uso sin conexión.
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

## ⚖️ Licencia
Este proyecto está bajo la licencia **GPLv3**. Consulte el archivo `LICENSE` para más detalles.

---
### ⚖️ Descargo de Responsabilidad (Disclaimer)
*Esta aplicación es un agregador de información basado en Inteligencia Artificial. Aunque se priorizan fuentes oficiales, los datos pueden tener retrasos o errores de interpretación. No sustituye en ningún caso a los canales de comunicación oficiales del Estado. **En caso de emergencia real, llame siempre al 112.***

<br/>

---

# 🚨 Spain Emergency Monitor v2.0 (Masterpiece Version)

**Last Update:** May 11, 2026 - 13:20 CEST

Advanced situational intelligence system designed for monitoring emergencies and incidents within the Spanish territory. Powered by **Google Gemini 3** multimodal architecture.

## 🌲 The Origin: Why this project exists
It all started during a walk in **Alcalá de Henares**. While walking through the countryside near the river, I saw a fire truck and a helicopter taking off. In that moment of uncertainty, I tried searching for real-time information on my mobile to find out what was happening and if there was any nearby danger, but it was impossible to find a centralized source reporting such localized incidents on the spot.

I realized that, although many emergency response tools exist, the information is often dispersed and not specific enough for small or very specific events in a nearby radius.

**Emergency Monitor** was born to solve that: allowing anyone to search within a specific radius if there are any reported incidents, unifying in one place alerts from local sources, social media, 112, Civil Protection, and DGT.

## 🚀 Production Deployment
The application is live at:
[https://alerta-local-espa-a-249485768002.us-west1.run.app/](https://alerta-local-espa-a-249485768002.us-west1.run.app/)

## 🧠 How it works: The Intelligence Engine

This system doesn't use a static database; instead, it employs a **Two-Phase AI Architecture** to ensure information is real and up-to-the-minute:

### Phase 1: Perception and Grounding (Google Search)
The system uses the **Gemini 3 Flash** model with Google Search Tool. This model actively scans the web looking for:
- **Official Sources**: AEMET (Weather), DGT (Traffic), Renfe/ADIF (Transport), and 112 emergency services.
- **Social Signals**: Citizen reports and breaking news in local and national press.

### Phase 2: Critical Analysis and Structuring (JSON Schema)
Once raw information is gathered, the **Gemini 3 Pro** model performs a forensic analysis of the data to:
1.  **De-duplicate**: Remove redundant reports of the same emergency.
2.  **Classify Severity**: Assign levels (CRITICAL, WARNING, INFO) based on real risk to life and property.
3.  **Source Mapping**: Link each alert with its verified source URL to avoid AI hallucinations.
4.  **Executive Summary**: Generate a textual risk analysis for the user.

## 🛠️ Main Features

- **Tactical Dashboard**: Interface inspired by military command centers, optimized for legibility under stress.
- **Progressive Web App (PWA)**: Installable on mobile and desktop devices as a native-like app, with basic offline support.
- **Professional Grade Audio**: Auditory feedback via **Web Audio API** to alert the user of critical changes without needing to look at the screen.
- **Active Monitor Mode**: The system can be configured to auto-refresh every 60 seconds, sending browser notifications if new threats are detected.
- **Smart Filters**: Ability to filter by radius (km), specific categories (Fire, Weather, Transport), or historical dates.
- **Custom Sources**: Advanced users can add specific URLs for the AI to monitor with priority.

## 📦 Local Installation and Configuration

1.  **Requirements**: [Node.js](https://nodejs.org/) (v18+).
2.  **Clone**: `git clone https://github.com/javierb507/Alerta-espa-a.git`
3.  **Dependencies**: `npm install`
4.  **API Key**: Create a `.env` file with `GEMINI_API_KEY=your_key`.
5.  **Run**: `npm run dev`

## ⚖️ License
This project is licensed under **GPLv3**. See the `LICENSE` file for more details.

---
### ⚖️ Disclaimer
*This application is an information aggregator based on Artificial Intelligence. Although official sources are prioritized, data may be delayed or misinterpreted. It is in no case a substitute for official State communication channels. **In case of a real emergency, always call 112.***
