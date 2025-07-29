# Große Datei Analyzer - 80MB+

Eine vollständige Web-App zur Analyse großer Dateien über 80MB mit fortschrittlichen Streaming-Techniken und moderner Benutzeroberfläche.

## 📁 Dateien

- `large-file-analyzer.html` - Grundlegende Version mit Streaming-Analyse
- `advanced-file-analyzer.html` - Erweiterte Version mit Visualisierung und Export-Funktionen

## 🚀 Features

### Grundlegende Version (`large-file-analyzer.html`)
- ✅ **Streaming-Analyse** für Dateien über 80MB
- ✅ **Chunk-basierte Verarbeitung** (0.5MB - 10MB Chunks)
- ✅ **Pausieren & Fortsetzen** der Analyse
- ✅ **Speicher-Monitoring** in Echtzeit
- ✅ **Mehrere Analysetypen**: Grundlegend, JSON, CSV
- ✅ **Fortschrittsanzeige** mit Prozentanzeige
- ✅ **Drag & Drop** Datei-Upload
- ✅ **Responsive Design** für alle Geräte

### Erweiterte Version (`advanced-file-analyzer.html`)
- ✅ **Alle Features der Grundversion**
- ✅ **Interaktive Charts** mit Chart.js
- ✅ **Word Cloud** Visualisierung
- ✅ **Export-Funktionen** (JSON, CSV, TXT)
- ✅ **Erweiterte Metriken** (Code-Zeilen, Kommentare, etc.)
- ✅ **Dateityp-Erkennung** (JSON, CSV, TXT, etc.)
- ✅ **Performance-Metriken** (Verarbeitungsgeschwindigkeit)
- ✅ **Kopieren in Zwischenablage**

## 🎯 Unterstützte Dateitypen

- **JSON** - Strukturanalyse mit Objekt/Array-Zählung
- **CSV** - Spalten- und Zeilenanalyse mit Trennzeichen-Erkennung
- **TXT** - Allgemeine Textanalyse
- **Log-Dateien** - Zeilenbasierte Analyse
- **Code-Dateien** - Syntax-Erkennung (JS, PY, Java, C++, etc.)
- **XML/YAML** - Strukturierte Daten
- **Markdown** - Dokumentationsdateien

## 📊 Analysierte Metriken

### Grundlegende Statistiken
- **Dateigröße** in Bytes, KB, MB, GB
- **Zeichenanzahl** (inkl. Leerzeichen)
- **Zeilenanzahl** (inkl. leere Zeilen)
- **Wortanzahl** (eindeutige Wörter)
- **Analyse-Zeit** in Millisekunden/Sekunden/Minuten

### Erweiterte Metriken
- **Durchschnittliche Zeilenlänge**
- **Code-Zeilen** vs. Kommentar-Zeilen
- **Leere Zeilen** Zählung
- **Zeichen-Häufigkeit** (Top 10)
- **Wort-Häufigkeit** mit Word Cloud
- **Dateityp-Erkennung**

### JSON-spezifische Analyse
- **Objekt-Anzahl**
- **Array-Anzahl**
- **String-Anzahl**
- **Number-Anzahl**
- **Boolean-Anzahl**
- **Null-Werte**
- **Maximale Verschachtelungstiefe**

### CSV-spezifische Analyse
- **Spaltenanzahl**
- **Zeilenanzahl**
- **Trennzeichen-Erkennung** (, ; Tab |)
- **Header-Erkennung**
- **Spaltennamen**

## 🛠️ Technische Details

### Streaming-Technologie
- **Chunk-basierte Verarbeitung** verhindert Browser-Crashes
- **FileReader API** für effiziente Dateiverarbeitung
- **Memory-Monitoring** in Echtzeit
- **AbortController** für sauberes Abbrechen

### Performance-Optimierungen
- **Konfigurierbare Chunk-Größen** (0.5MB - 10MB)
- **Pausieren/Fortsetzen** für sehr große Dateien
- **Effiziente Text-Decodierung** mit TextDecoder
- **Speicher-Management** mit Uint8Array

### Browser-Kompatibilität
- **Chrome** (empfohlen)
- **Firefox** (empfohlen)
- **Edge** (empfohlen)
- **Safari** (grundlegende Unterstützung)

## 🚀 Verwendung

### 1. Grundlegende Version starten
```bash
# Öffnen Sie die Datei in einem Browser
open large-file-analyzer.html
```

### 2. Erweiterte Version starten
```bash
# Öffnen Sie die Datei in einem Browser
open advanced-file-analyzer.html
```

### 3. Datei analysieren
1. **Datei hochladen** via Drag & Drop oder Klick
2. **Analysetyp wählen** (Grundlegend, JSON, CSV)
3. **Chunk-Größe anpassen** (1-2MB für Dateien >100MB)
4. **Analyse starten** und Fortschritt verfolgen
5. **Ergebnisse exportieren** (nur erweiterte Version)

## ⚙️ Konfiguration

### Optimale Chunk-Größen
- **0.5MB**: Sehr große Dateien (>1GB)
- **1MB**: Große Dateien (100MB-1GB)
- **2MB**: Mittlere Dateien (50MB-100MB)
- **5MB**: Kleine Dateien (<50MB)
- **10MB**: Sehr kleine Dateien (<10MB)

### Speicher-Management
- **Memory-Monitoring** zeigt aktuellen Speicherverbrauch
- **Automatische Pause** bei hohem Speicherverbrauch
- **Chunk-Größe reduzieren** bei Speicherproblemen

## 📈 Performance-Tipps

### Für sehr große Dateien (>500MB)
1. **Chunk-Größe auf 0.5MB reduzieren**
2. **Browser schließen** andere Tabs
3. **Regelmäßig pausieren** um Speicher freizugeben
4. **Chrome/Firefox** verwenden (beste Performance)

### Für JSON-Dateien
1. **JSON-Analysetyp** wählen für detaillierte Strukturanalyse
2. **Chunk-Größe erhöhen** für bessere Performance
3. **Export-Funktionen** nutzen für weitere Verarbeitung

### Für CSV-Dateien
1. **CSV-Analysetyp** wählen für Spaltenanalyse
2. **Trennzeichen-Erkennung** funktioniert automatisch
3. **Header-Erkennung** für strukturierte Daten

## 🔧 Troubleshooting

### Browser-Crash
- **Chunk-Größe reduzieren** (0.5MB)
- **Andere Tabs schließen**
- **Browser neu starten**

### Langsame Performance
- **Chunk-Größe erhöhen** (2-5MB)
- **Pausieren/Fortsetzen** verwenden
- **Memory-Monitoring** beobachten

### Datei wird nicht geladen
- **Dateityp prüfen** (nur Textdateien)
- **Dateigröße prüfen** (Browser-Limits)
- **Browser-Kompatibilität** prüfen

### Export funktioniert nicht
- **Nur erweiterte Version** hat Export-Funktionen
- **Browser-Berechtigungen** prüfen
- **Pop-up-Blocker** deaktivieren

## 🎨 Customization

### Styling anpassen
```css
/* Eigene Farben definieren */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
}
```

### Chunk-Größen anpassen
```javascript
// In der HTML-Datei die Optionen ändern
<option value={0.25}>0.25 MB</option>
<option value={0.5}>0.5 MB</option>
<option value={1}>1 MB</option>
<option value={2}>2 MB</option>
<option value={5}>5 MB</option>
<option value={10}>10 MB</option>
<option value={20}>20 MB</option>
```

### Neue Analysetypen hinzufügen
```javascript
// Neue Analyse-Funktion erstellen
const analyzeCustom = useCallback((data) => {
    // Eigene Analyse-Logik
    return {
        customMetric: 'value',
        // ... weitere Metriken
    };
}, []);
```

## 📊 Beispiel-Ausgaben

### Grundlegende Analyse
```
Dateigröße: 150.5 MB
Zeichen: 157,286,400
Zeilen: 2,048,000
Wörter: 25,600,000
Eindeutige Wörter: 45,000
Analyse-Zeit: 2.3s
```

### JSON-Analyse
```
Objekte: 15,000
Arrays: 8,500
Strings: 45,000
Zahlen: 12,000
Maximale Tiefe: 8
```

### CSV-Analyse
```
Spalten: 25
Zeilen: 1,000,000
Trennzeichen: ","
Header: Ja
```

## 🤝 Beitragen

### Verbesserungsvorschläge
1. **Neue Analysetypen** hinzufügen
2. **Performance-Optimierungen** implementieren
3. **UI/UX-Verbesserungen** vorschlagen
4. **Bug-Reports** erstellen

### Entwicklung
1. **Fork** des Repositories
2. **Feature-Branch** erstellen
3. **Änderungen** implementieren
4. **Pull Request** erstellen

## 📄 Lizenz

Diese App ist Open Source und steht unter der MIT-Lizenz zur freien Verfügung.

## 🆘 Support

Bei Problemen oder Fragen:
1. **Troubleshooting-Abschnitt** prüfen
2. **Browser-Konsole** für Fehlermeldungen checken
3. **Issue** im Repository erstellen

---

**Entwickelt für die effiziente Analyse großer Dateien mit modernen Web-Technologien.**