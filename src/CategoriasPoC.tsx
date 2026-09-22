import React, { useState } from 'react';

// Reemplazá con la URL real de tu Web Service en Render
const RENDER_API_URL = "https://tu-app-en-render.onrender.com/api/categorias";

type CategoriaResponse = {
  status: 'success' | 'error';
  message: string;
  data: {
    id: number;
    nombre_es: string;
    nombre_en: string;
    orden: number;
    imagen_url: string;
    created_at: string;
  };
};

export default function CategoriaPoC() {
  const [nombreEs, setNombreEs] = useState('');
  const [nombreEn, setNombreEn] = useState('');
  const [orden, setOrden] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState<CategoriaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert("Por favor selecciona una imagen");
      return;
    }

    setLoading(true);
    setRespuesta(null);
    setError(null);

    // Armar el objeto FormData para multipart/form-data
    const formData = new FormData();
    formData.append("nombre_es", nombreEs);
    formData.append("nombre_en", nombreEn);
    formData.append("orden", String(orden));
    formData.append("file", file);

    try {
      const response = await fetch(RENDER_API_URL, {
        method: "POST",
        body: formData, // No definir Content-Type, fetch lo asigna automáticamente con el boundary
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error en la solicitud");
      }

      setRespuesta(data);
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("Error en la solicitud");
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>PoC: Insertar Categoría (Vercel ➔ Render)</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Nombre (ES):</label>
          <input 
            type="text" 
            value={nombreEs} 
            onChange={(e) => setNombreEs(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Nombre (EN):</label>
          <input 
            type="text" 
            value={nombreEn} 
            onChange={(e) => setNombreEn(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Orden:</label>
          <input 
            type="number" 
            value={orden} 
            onChange={(e) => setOrden(Number(e.target.value))} 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Imagen de Categoría:</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
            required 
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', cursor: 'pointer' }}>
          {loading ? "Enviando a Render..." : "Crear Categoría"}
        </button>
      </form>

      {/* Resultados de la PoC */}
      {respuesta && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6ffe6', border: '1px solid #00b300' }}>
          <h4>✅ Resultado Exitoso:</h4>
          <p><strong>ID:</strong> {respuesta.data.id}</p>
          <p><strong>URL Imagen (Vercel Blob):</strong></p>
          <a href={respuesta.data.imagen_url} target="_blank" rel="noreferrer">
            {respuesta.data.imagen_url}
          </a>
          <br /><br />
          <img src={respuesta.data.imagen_url} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffe6e6', border: '1px solid #cc0000' }}>
          <h4>❌ Error:</h4>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}