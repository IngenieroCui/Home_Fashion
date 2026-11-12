import Link from 'next/link';

export default function PrivacyPage() {
  return <main className="admin-stack" style={{ maxWidth: '46rem', margin: '3rem auto', padding: '0 1rem' }}>
    <h1 className="font-serif text-4xl">Privacidad en las cotizaciones</h1>
    <p>Home Fashion usa el nombre, teléfono, correo opcional y detalles que envías para responder la solicitud y preparar tu cotización.</p>
    <p>El personal autorizado consulta esos datos para atender la solicitud. Evita incluir documentos de identidad, información financiera o datos de otras personas en el mensaje.</p>
    <h2>Consultas y solicitudes sobre tus datos</h2>
    <p>Contacta a Home Fashion por el canal que figure en la respuesta a tu cotización. Puedes solicitar acceso, corrección o supresión. Conserva el código de solicitud para facilitar la identificación del registro.</p>
    <Link className="text-link" href="/catalogo">Volver al catálogo</Link>
  </main>;
}
