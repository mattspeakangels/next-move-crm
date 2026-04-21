  const handleComplete = () => {
    // Salvataggio
    setProfile({ 
      name, role, company, 
      defaultMonthlyTarget: parseInt(target, 10),
      customProducts: products 
    });
    
    const now = new Date();
    const targetId = `${now.getFullYear()}-${now.getMonth()}`;
    updateTarget(targetId, {
      id: targetId,
      month: now.getMonth(),
      year: now.getFullYear(),
      targetValue: parseInt(target, 10),
      closedValue: 0
    });

    // IMPORTANTE: Su mobile usiamo il metodo più drastico per uscire dal loop
    // Diamo tempo al browser di scrivere su disco prima di ricaricare
    setTimeout(() => {
        window.location.replace('/'); 
    }, 500);
  };
