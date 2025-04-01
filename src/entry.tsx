// src/entry.tsx
import ReactDOM from 'react-dom/client';
import { BlockRegistry } from './blockRegistry';

function initBlocks() {
    const elements = document.querySelectorAll('[data-entryscape]');

    elements.forEach((el) => {
        const blockName = el.getAttribute('data-entryscape');
        if (blockName && BlockRegistry[blockName]) {
            const Component = BlockRegistry[blockName];
            const root = ReactDOM.createRoot(el);
            root.render(<Component />);
        }
    });
}

initBlocks();
