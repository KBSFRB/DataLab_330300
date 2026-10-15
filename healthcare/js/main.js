import Alpine from 'alpinejs';
import { createApp } from './app.js';

// Register the root component before Alpine scans the document.
Alpine.data('app', createApp);
Alpine.start();
