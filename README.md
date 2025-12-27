
# 🚨 Monitor de Emergencias España (Masterpiece Version)

Sistema avanzado de inteligencia situacional diseñado para la monitorización de emergencias y sucesos en el territorio español. Impulsado por la arquitectura multimodal de **Google Gemini 3**.

## 🚀 Despliegue en Producción
La aplicación se encuentra activa en:
[https://alerta-local-espa-a-249485768002.us-west1.run.app/](https://alerta-local-espa-a-249485768002.us-west1.run.app/)

## 🛠️ Arquitectura de Inteligencia
La aplicación utiliza un flujo de datos de dos fases para garantizar la precisión:
1.  **Grounding (Google Search)**: Recopilación de información fresca de fuentes como **AEMET**, **DGT**, servicios de emergencia **112** y prensa regional.
2.  **Structuring (JSON Schema)**: La IA procesa los resultados brutos y los clasifica según su severidad y categoría, eliminando ruidos y duplicados.

## 💎 Características Premium
- **UI Command Center**: Diseño de alta fidelidad con rejilla táctica y desenfoques cinemáticos.
- **Audio Sintético**: Feedback sensorial mediante Web Audio para acciones críticas.
- **Social Sharing**: Integración nativa para compartir reportes de emergencia por canales de mensajería.
- **Consultas Históricas**: Capacidad de "rebobinar" la situación de seguridad de cualquier zona en fechas pasadas.

## 📦 Instalación Local
```bash
# Requiere Node.js y una API_KEY de Gemini en el entorno
npm install
npm run dev
```

---
*Este proyecto es una herramienta de agregación de datos y no sustituye a las autoridades oficiales. En caso de emergencia real en España, llame inmediatamente al 112.*
