import { Deal, Activity } from '../types';

export interface SuggestedDeal extends Deal {
  coachScore: number;
  coachReason: string;
}

export const generateCoachSuggestions = (activeDeals: Deal[], activities: Activity[]): SuggestedDeal[] => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowEnd = todayStart + (2 * 24 * 60 * 60 * 1000) - 1;
  const sevenDaysAgo = todayStart - (7 * 24 * 60 * 60 * 1000);

  const suggestions = activeDeals.map(deal => {
    let score = deal.value * (deal.probability / 100);
    const reasons: string[] = [];
    const formatK = (val: number) => `€${Math.round(val / 1000)}k`;

    reasons.push(`${formatK(deal.value)} al ${deal.probability}%`);

    if (deal.nextActionDeadline >= todayStart && deal.nextActionDeadline <= tomorrowEnd) {
      const isToday = deal.nextActionDeadline < (todayStart + 86400000);
      score += 20000; 
      reasons.push(`${deal.nextAction} ${isToday ? 'oggi' : 'domani'}`);
    }

    const dealActivities = activities.filter(a => a.dealId === deal.id);
    const lastActivityDate = dealActivities.length > 0 ? Math.max(...dealActivities.map(a => a.date)) : deal.createdAt;

    if (lastActivityDate < sevenDaysAgo) {
      const daysSince = Math.floor((todayStart - lastActivityDate) / 86400000);
      score += 15000;
      reasons.push(`nessun contatto da ${daysSince} giorni`);
    }

    return { ...deal, coachScore: score, coachReason: reasons.join(', ') };
  });

  return suggestions.sort((a, b) => b.coachScore - a.coachScore);
};
