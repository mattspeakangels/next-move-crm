<div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">
    Scegli Azienda / Cliente
  </label>
  <select 
    required
    value={formData.contactId} 
    onChange={e => setFormData({...formData, contactId: e.target.value})}
    className="w-full border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-transparent dark:text-white mt-1 outline-none focus:border-indigo-500 appearance-none font-bold"
  >
    <option value="">Seleziona un'azienda...</option>
    {Object.values(contacts).map(c => (
      <option key={c.id} value={c.id}>{c.company}</option>
    ))}
  </select>
</div>
