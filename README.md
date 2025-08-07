# CS2 Steam Points Sender

Utility for automatically logging into a Steam account using a `.ma` file and gifting Steam points to another user while retaining 200 points.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `config.example.json` to `config.json` and fill in your credentials (Steam account, path to your `.ma` file, and target SteamID).
3. Run the application:
   ```bash
   npm start -- --full-auto --quiet
   ```
   Remove `--quiet` to see logs.

## Testing

```bash
npm test
```
