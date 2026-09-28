import React, { useState, useEffect } from 'react';
import { BRAND_CONFIG } from '../../config/brandConfig';

interface AdminPrinterSettingsProps {
  onClose?: () => void;
}

export default function AdminPrinterSettings({ onClose }: AdminPrinterSettingsProps) {
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [useDirectPrint, setUseDirectPrint] = useState(false);
  const [relayUrl, setRelayUrl] = useState('http://localhost:8080/print');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const config = localStorage.getItem('brand_printer_config') || localStorage.getItem('sff_printer_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        if (parsed.ip) setIpAddress(parsed.ip);
        if (parsed.port) setPort(parsed.port);
        if (parsed.useDirectPrint !== undefined) setUseDirectPrint(parsed.useDirectPrint);
        if (parsed.relayUrl) setRelayUrl(parsed.relayUrl);
      } catch (e) {
        console.error('Error parsing printer config', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('brand_printer_config', JSON.stringify({
      ip: ipAddress,
      port,
      useDirectPrint,
      relayUrl
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestPrint = async () => {
    if (!useDirectPrint) {
      window.print();
      return;
    }

    try {
      const payload = {
        printer_ip: ipAddress,
        printer_port: parseInt(port),
        text: `${BRAND_CONFIG.name.toUpperCase()}\nTEST DE IMPRESION RED DIRECTA\n-------------------------\nImpresora Termica Configurada Correctamente.\n\n\n\n\n\n`
      };

      const res = await fetch(relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Comando enviado exitosamente a la impresora local.");
      } else {
        alert("Error de red al conectar con el servidor proxy de impresión.");
      }
    } catch (error) {
      alert("No se pudo contactar al proxy de impresión local (" + relayUrl + "). Asegúrate de que el script de relay esté ejecutándose en este ordenador.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm max-w-lg w-full mx-auto text-zinc-900 font-sans">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-zinc-100">
        <h2 className="text-lg font-display font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          <span>Impresora Térmica TP8002</span>
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100">✕</button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 cursor-pointer" onClick={() => setUseDirectPrint(!useDirectPrint)}>
          <input type="checkbox" checked={useDirectPrint} onChange={() => {}} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-zinc-800">Modo de Red Independiente (LAN Directo)</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Envía comandos ESC/POS mediante proxy local sin interferir con otros sistemas de caja.</p>
          </div>
        </div>

        {useDirectPrint && (
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">IP Impresora Local</label>
                <input 
                  type="text" 
                  value={ipAddress} 
                  onChange={e => setIpAddress(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs text-zinc-900 focus:border-amber-500 outline-none"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Puerto (TCP)</label>
                <input 
                  type="text" 
                  value={port} 
                  onChange={e => setPort(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs text-zinc-900 focus:border-amber-500 outline-none"
                  placeholder="9100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">URL del Proxy Node.js Local</label>
              <input 
                type="text" 
                value={relayUrl} 
                onChange={e => setRelayUrl(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl p-2.5 text-xs text-zinc-900 focus:border-amber-500 outline-none"
                placeholder="http://localhost:8080/print"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-3 border-t border-zinc-100">
          <button 
            onClick={handleTestPrint}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Prueba de Conexión
          </button>
          <button 
            onClick={handleSave}
            className={`flex-1 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs ${saved ? 'bg-emerald-600 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
          >
            {saved ? '✓ Guardado' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
