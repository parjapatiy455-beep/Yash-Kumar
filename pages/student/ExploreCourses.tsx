
import React from 'react';
import { BatchesPage as BatchesPageComponent } from '../../components/BatchesPage';

// This file is kept for routing purposes but renders the new component.
// In a real refactor, this file would be renamed to BatchesPage.tsx.
const BatchesPage: React.FC = () => {
    return <BatchesPageComponent />;
};

export default BatchesPage;