# File Analyzer - Large File Analysis Tool

Eine moderne Web-Anwendung zur effizienten Analyse von großen Dateien (über 80MB) mit Stream-basierter Verarbeitung, Chunk-Upload und Echtzeit-Fortschrittsanzeige.

## Features

- **Chunk-basiertes File Upload**: Große Dateien werden in Chunks aufgeteilt für stabilen Upload
- **Stream-basierte Verarbeitung**: Effiziente Verarbeitung großer Dateien ohne Speicherprobleme
- **Echtzeit-Updates**: Live-Fortschrittsanzeige während Upload und Analyse
- **Umfassende Analysen**:
  - Basis-Informationen (Größe, Typ, Timestamps)
  - Inhaltsanalyse (Zeilen, Wörter, Zeichen)
  - Statistische Analyse (Worthäufigkeit, Zeichenverteilung)
  - Hash-Berechnung (MD5, SHA1, SHA256)
  - Strukturanalyse
  - Metadaten-Extraktion
- **Moderne UI**: React mit Tailwind CSS für eine schöne und responsive Oberfläche
- **Skalierbare Architektur**: Queue-basierte Verarbeitung mit Redis und Bull

## Technologie-Stack

### Backend
- Node.js mit TypeScript
- Express.js für REST API
- Socket.io für Echtzeit-Kommunikation
- Bull/Redis für Job Queue
- Multer für File Upload
- Stream API für effiziente Dateiverarbeitung

### Frontend
- React 18 mit TypeScript
- Vite als Build-Tool
- Tailwind CSS für Styling
- React Router für Navigation
- Recharts für Datenvisualisierung
- Axios für API-Kommunikation

## Voraussetzungen

- Node.js 18+ 
- Redis 7+
- Docker und Docker Compose (optional)

## Installation und Start

### Mit Docker (empfohlen)

1. Repository klonen:
```bash
git clone <repository-url>
cd file-analyzer-app
```

2. Mit Docker Compose starten:
```bash
docker-compose up -d
```

Die App ist dann verfügbar unter:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Manuelle Installation

1. Repository klonen und Dependencies installieren:
```bash
git clone <repository-url>
cd file-analyzer-app
npm run install-all
```

2. Redis starten:
```bash
redis-server
```

3. Umgebungsvariablen konfigurieren:
```bash
cp server/.env.example server/.env
# .env Datei anpassen
```

4. Backend starten:
```bash
cd server
npm run dev
```

5. Frontend starten (in neuem Terminal):
```bash
cd client
npm run dev
```

## Verwendung

1. **Datei hochladen**: 
   - Navigiere zur Upload-Seite
   - Ziehe eine Datei (min. 80MB) in den Upload-Bereich
   - Der Upload startet automatisch in Chunks

2. **Analyse-Typen auswählen**:
   - Nach erfolgreichem Upload wählst du die gewünschten Analysen aus
   - Standardmäßig sind alle Analysen ausgewählt

3. **Ergebnisse anzeigen**:
   - Die Analyse läuft im Hintergrund
   - Fortschritt wird in Echtzeit angezeigt
   - Ergebnisse werden in verschiedenen Tabs dargestellt
   - Ergebnisse können als JSON heruntergeladen werden

## API Endpoints

### Upload
- `POST /api/upload/init` - Upload-Session initialisieren
- `POST /api/upload/chunk/:uploadId` - Chunk hochladen
- `POST /api/upload/complete/:uploadId` - Upload abschließen
- `DELETE /api/upload/:uploadId` - Upload abbrechen

### Analyse
- `POST /api/analyze/start` - Analyse starten
- `GET /api/analyze/status/:jobId` - Status abfragen
- `GET /api/analyze/results/:jobId` - Ergebnisse abrufen
- `GET /api/analyze/types` - Verfügbare Analyse-Typen
- `DELETE /api/analyze/:jobId` - Analyse abbrechen

## Entwicklung

### Projektstruktur
```
file-analyzer-app/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React Komponenten
│   │   ├── pages/        # Seiten-Komponenten
│   │   ├── utils/        # Hilfsfunktionen
│   │   └── services/     # API Services
│   └── ...
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── routes/       # API Routes
│   │   ├── services/     # Business Logic
│   │   ├── workers/      # Background Workers
│   │   ├── utils/        # Hilfsfunktionen
│   │   └── middleware/   # Express Middleware
│   └── ...
├── shared/               # Gemeinsame Typen/Utils
├── uploads/              # Upload-Verzeichnis
└── docker-compose.yml    # Docker Konfiguration
```

### Tests ausführen
```bash
# Backend Tests
cd server && npm test

# Frontend Tests
cd client && npm test
```

## Performance

Die App ist optimiert für große Dateien:
- Chunk-Upload verhindert Timeouts
- Stream-Verarbeitung minimiert Speicherverbrauch
- Queue-System ermöglicht parallele Verarbeitung
- Automatische Bereinigung alter Dateien

## Sicherheit

- Dateigrößen-Validierung
- Automatische Bereinigung nach 24h
- Sichere Dateinamen-Generierung
- CORS-Konfiguration

## Lizenz

MIT