import { Contact, Deal, Activity } from '../types';

export const generateMockData = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = (n: number) => n * 86400000;
  
  const contacts: Record<string, Contact> = {
    'c1': { id: 'c1', company: 'Ottix Manufacturing', contactName: 'Lucia Verdi', role: 'Purchasing Manager', email: 'l.verdi@ottix.it', phone: '031 123456', region: 'Como', sector: 'Automotive', createdAt: today - days(30), updatedAt: today - days(2) },
    'c2': { id: 'c2', company: 'Meccatrend Srl', contactName: 'Marco Ferretti', role: 'CEO', email: 'm.ferretti@meccatrend.it', phone: '030 987654', region: 'Brescia', sector: 'Industrial Machinery', createdAt: today - days(15), updatedAt: today - days(1) }
  };

  const deals: Record<string, Deal> = {
    'd1': { id: 'd1', contactId: 'c1', value: 112000, probability: 65, products: ['PMMA', 'PC'], stage: 'negoziazione', nextAction: 'Closing meeting', nextActionDeadline: today, notes: '', createdAt: today - days(30), updatedAt: today },
    'd2': { id: 'd2', contactId: 'c2', value: 85000, probability: 40, products: ['PTFE'], stage: 'proposta', nextAction: 'Inviare offerta rivista', nextActionDeadline: today + days(1), notes: '', createdAt: today - days(15), updatedAt: today }
  };

  const wonThisMonth = Object.values(deals).filter(d => d.stage === 'chiuso-vinto').reduce((acc, d) => acc + d.value, 0);

  return { 
    contacts, 
    deals, 
    activities: {}, 
    targets: {
      [`${now.getFullYear()}-${now.getMonth()}`]: { 
        id: `${now.getFullYear()}-${now.getMonth()}`, 
        month: now.getMonth(), 
        year: now.getFullYear(), 
        targetValue: 400000, 
        closedValue: wonThisMonth 
      }
    },
    profile: {
      name: 'Commerciale Demo',
      role: 'Sales Manager',
      company: 'Mia Azienda Srl',
      defaultMonthlyTarget: 400000,
      customProducts: ['POM', 'PA6', 'PET', 'PEEK', 'PTFE', 'PMMA', 'PC']
    }
  };
};
