import { Contact, Deal, Activity } from '../types';

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    company: 'Tech Innovators SpA',
    contactName: 'Marco Bianchi',
    role: 'CTO',
    email: 'marco@tech.it',
    phone: '3331234567',
    region: 'Lombardia',
    sector: 'Software',
    status: 'cliente',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'c2',
    company: 'Green Energy Srl',
    contactName: 'Laura Rossi',
    role: 'Purchasing',
    email: 'laura@green.it',
    phone: '3339876543',
    region: 'Lazio',
    sector: 'Energia',
    status: 'potenziale',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const MOCK_DEALS: Deal[] = [];
export const MOCK_ACTIVITIES: Activity[] = [];
