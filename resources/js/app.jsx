import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import SugarLab from './SugarLab';
import '../css/app.css';

createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <SugarLab />
    </React.StrictMode>,
);