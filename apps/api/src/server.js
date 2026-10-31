import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, '0.0.0.0', () => {
  console.log(`Dependency Guard API listening on http://localhost:${config.port}`);
});
