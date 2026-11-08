import React, { useState } from 'react';

export const LegalDocumentation: React.FC = () => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('brus_lyrics_legal_agreed') === 'true';
    }
    return false;
  });

  const handleAgreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setHasAgreed(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('brus_lyrics_legal_agreed', checked ? 'true' : 'false');
    }
  };

  return (
    <div className="legal-page-container">
      <div className="legal-page-inner">
        {/* Header Banner */}
        <div className="legal-hero-header">
          <div className="legal-badge-pill">
            <span>HONDURAS &amp; INTERNATIONAL JURISDICTION</span>
          </div>
          <h1 className="legal-main-title">
            Marco Jurídico, Términos y Condiciones, y Política de Privacidad de Bru&apos;s Lyrics
          </h1>
          <p className="legal-main-sub">
            Compendio legal exhaustivo y vinculante aplicable a la plataforma digital Bru&apos;s Lyrics. Creada, constituida y operada en la República de Honduras bajo la legislación nacional e internacional de propiedad intelectual, comercio electrónico y protección de datos.
          </p>
          <div className="legal-meta-strip">
            <span>Jurisdicción: Tegucigalpa, Municipio del Distrito Central, Francisco Morazán, República de Honduras</span>
            <span className="meta-sep">•</span>
            <span>Última Actualización y Entrada en Vigor: 8 de Noviembre de 2026</span>
          </div>
        </div>

        {/* Interactive Agreement Box */}
        <div className="legal-agreement-box">
          <div className="agreement-checkbox-row">
            <input
              type="checkbox"
              id="legal-agree-checkbox"
              checked={hasAgreed}
              onChange={handleAgreeChange}
              className="legal-checkbox"
            />
            <label htmlFor="legal-agree-checkbox" className="agreement-label">
              <strong>Aceptación Expresa de los Términos y Políticas:</strong> He leído íntegramente, comprendo y acepto de manera irrevocable los Términos de Servicio, el Procedimiento de Notificación y Retirada DMCA / Ley Hondureña, y la Política de Privacidad aquí establecidos para el uso de Bru&apos;s Lyrics.
            </label>
          </div>
          {hasAgreed && (
            <div className="agreement-confirmed-badge">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
              </svg>
              <span>Consentimiento registrado formalmente en almacenamiento local.</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="legal-sections-wrapper">
          {/* Cap. 1 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              1. Fundamento Constitucional y Régimen de Propiedad Intelectual en la República de Honduras
            </h2>
            <div className="legal-text-block">
              <p>
                La plataforma digital <strong>Bru&apos;s Lyrics</strong> ha sido concebida, desarrollada y operada desde la República de Honduras, sujetándose formalmente al ordenamiento jurídico soberano de la nación, en estricta consonancia con los tratados internacionales de los cuales Honduras es Estado Parte.
              </p>
              <h3>1.1. Constitución de la República de Honduras</h3>
              <p>
                El <strong>Artículo 182</strong> de la Constitución de la República consagra la Garantía Constitucional del <em>Habeas Data</em>, estableciendo que toda persona tiene el derecho a acceder a la información sobre sí misma o sus bienes que conste en registros públicos o privados, y a exigir su actualización, rectificación o cancelación en caso de inexactitud o ilicitud. Bru&apos;s Lyrics adopta este principio fundamental como pilar innegociable de su arquitectura de autenticación y tratamiento de datos personales.
              </p>
              <p>
                Asimismo, los <strong>Artículos 60 y 61</strong> constitucionales garantizan la libertad, la igualdad ante la ley y la inviolabilidad de los derechos individuales, los cuales rigen de manera transversal en el acceso a la plataforma sin discriminación arbitraria.
              </p>

              <h3>1.2. Ley del Derecho de Autor y de los Derechos Conexos de Honduras (Decreto Legislativo No. 4-99-E)</h3>
              <p>
                La protección de las obras del ingenio humano en el territorio hondureño se rige por el <strong>Decreto No. 4-99-E</strong> del Congreso Nacional de la República de Honduras, y sus reformas posteriores publicadas en el Diario Oficial <em>La Gaceta</em>. En aplicación de dicho cuerpo legal:
              </p>
              <ul>
                <li>
                  <strong>Naturaleza Jurídica de las Letras Musicales (Artículos 1, 2 y 4):</strong> Las letras de canciones constituyen obras literarias protegidas por el solo hecho de su creación, con total independencia de la fijación fonográfica o de la ejecución sonora instrumental. Bru&apos;s Lyrics reconoce expresamente que los derechos de autor sobre las letras subyacentes pertenecen de manera exclusiva a sus respectivos letristas, compositores, editoras musicales y entidades de gestión colectiva (tales como la Asociación de Autores, Compositores e Intérpretes Musicales de Honduras - AACIMH, y entidades internacionales recíprocas).
                </li>
                <li>
                  <strong>Derechos Morales Inalienables e Imprescriptibles (Artículos 16 y 18):</strong> La legislación hondureña confiere a los autores derechos morales perpetuos, inalienables, inembargables e irrenunciables, que incluyen:
                  <ol>
                    <li>El derecho de Paternidad: a ser reconocido formalmente como autor de la obra;</li>
                    <li>El derecho de Integridad: a oponerse a cualquier deformación, mutilación o modificación que cause perjuicio a su honor o reputación;</li>
                    <li>El derecho de Inédito: a decidir si la obra ha de ser divulgada y en qué forma;</li>
                    <li>El derecho de Modificación y de Retracto o Retiro de la circulación.</li>
                  </ol>
                  Bru&apos;s Lyrics vela rigurosamente por la atribución moral de los letristas, exhibiendo siempre los nombres de los compositores y artistas en la interfaz y en los metadatos TTML.
                </li>
                <li>
                  <strong>Derechos Patrimoniales Exclusivos (Artículos 20 al 25):</strong> Corresponde exclusivamente al autor o a sus derechohabientes el ejercicio de los derechos de explotación económica, en especial la reproducción en cualquier forma o procedimiento, la comunicación pública telemática, la distribución y la transformación. La inclusión de fragmentos textuales en Bru&apos;s Lyrics se realiza en observancia estricta del marco de excepciones legales o mediante la provisión técnica de sincronización silábica como valor añadido computacional.
                </li>
                <li>
                  <strong>Límites y Excepciones al Derecho de Autor (Artículos 44 al 50):</strong> La Ley hondureña establece que es lícita la utilización de obras ajenas sin autorización previa del autor ni remuneración, siempre que no atente contra la explotación normal de la obra ni cause un perjuicio injustificado a los intereses legítimos del titular. En particular, el Artículo 44 autoriza el <em>Derecho de Cita</em> para fines de análisis, crítica, docencia o investigación, a condición de que se mencione el nombre del autor y la fuente de donde fue tomada la obra.
                </li>
                <li>
                  <strong>Régimen de Observancia y Sanciones (Artículos 115 al 130):</strong> El titular de un derecho protegido que sea infringido puede incoar las acciones civiles, cautelares y resarcitorias ante los Juzgados de Letras de la República de Honduras, exigiendo la cesación inmediata de la actividad ilícita, el secuestro de ejemplares o datos, y la indemnización correspondiente.
                </li>
              </ul>

              <h3>1.3. Ley de Propiedad Industrial de Honduras (Decreto Legislativo No. 12-99-E)</h3>
              <p>
                Los elementos distintivos, la denominación comercial <strong>Bru&apos;s Lyrics</strong>, el logotipo estilizado, la arquitectura del software de sincronización (<em>TTML Engine</em>, <em>BrusLyricsRenderer</em>) y la compilación técnica de la base de datos constituyen propiedad industrial y tecnológica protegida conforme al Decreto No. 12-99-E. Queda terminantemente prohibida su reproducción no autorizada, ingeniería inversa abusiva o suplantación en el tráfico mercantil.
              </p>
            </div>
          </section>

          {/* Cap. 2 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              2. Régimen de Comercio Electrónico y Limitación de Responsabilidad de Intermediarios en Honduras
            </h2>
            <div className="legal-text-block">
              <h3>2.1. Ley de Comercio Electrónico de Honduras (Decreto Legislativo No. 149-2014)</h3>
              <p>
                El <strong>Decreto No. 149-2014</strong> regula el empleo de las tecnologías de la información en las actividades comerciales y de servicios de la sociedad de la información en Honduras:
              </p>
              <ul>
                <li>
                  <strong>Validez Jurídica de Mensajes de Datos y Contratos Electrónicos (Artículos 1 al 10):</strong> Los contratos perfeccionados a través de medios electrónicos mediante mecanismos de adhesión o aceptación por pulsación (<em>click-wrap agreements</em>) poseen plena fuerza ejecutiva, validez probatoria y eficacia vinculante en juicio. Al hacer clic en los controles del servicio, el usuario perfecciona un acuerdo legal con Bru&apos;s Lyrics.
                </li>
                <li>
                  <strong>Estatuto de Intermediario Técnico y Proveedor de Alojamiento (Artículos 23 al 28):</strong> Los prestadores de servicios de la sociedad de la información que presten servicios de intermediación técnica, alojamiento de datos suministrados por los destinatarios del servicio (<em>hosting</em>) o motores de búsqueda, <strong>no son civil ni administrativamente responsables</strong> por los contenidos que transmitan, alojen o indexen procedentes de terceros, siempre y cuando:
                  <ol>
                    <li>No tengan conocimiento efectivo de que la actividad o la información es ilícita o de que lesiona bienes o derechos de un tercero susceptibles de indemnización; o</li>
                    <li>Si tienen dicho conocimiento, actúen con la diligencia debida y de forma expedita para retirar los datos infractores o impedir el acceso a los mismos.</li>
                  </ol>
                </li>
              </ul>
              <p>
                Bru&apos;s Lyrics califica bajo la ley hondureña como un prestador de servicios de indexación, sincronización computacional y alojamiento de contenido generado por la comunidad (UGC), amparándose enteramente en la exención de responsabilidad patrimonial directa en tanto cumpla de forma diligente su procedimiento de notificación y retirada.
              </p>
            </div>
          </section>

          {/* Cap. 3 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              3. Tratados y Convenios Internacionales Vinculantes para Honduras
            </h2>
            <div className="legal-text-block">
              <p>
                Conforme a los Artículos 16, 17 y 18 de la Constitución de la República de Honduras, los tratados internacionales celebrados por Honduras con otros Estados, una vez ratificados por el Congreso Nacional y publicados en <em>La Gaceta</em>, forman parte del derecho interno nacional:
              </p>
              <ul>
                <li>
                  <strong>Convenio de Berna para la Protección de las Obras Literarias y Artísticas (Acta de París de 1971):</strong> Establece el principio rector de <em>Trato Nacional</em> (los autores extranjeros gozan en Honduras de los mismos derechos que la ley concede a los autores hondureños) y la <em>Protección Automática</em> sin sujeción a formalidad alguna. Bru&apos;s Lyrics aplica estas directrices para la protección universal de compositores de todos los países miembros de la Unión de Berna.
                </li>
                <li>
                  <strong>Tratado de la OMPI sobre Derecho de Autor (WCT - 1996) y Tratado de la OMPI sobre Interpretación o Ejecución y Fonogramas (WPPT - 1996):</strong> Tutelan la explotación de obras en entornos telemáticos y redes de datos, sancionando la neutralización de Medidas Tecnológicas de Protección (MTP) y la alteración dolosa de la Información sobre la Gestión de Derechos (RMI) incorporada en formatos de distribución digital como TTML y LRC.
                </li>
                <li>
                  <strong>Tratado de Libre Comercio entre la República Dominicana, Centroamérica y los Estados Unidos (DR-CAFTA):</strong> El <strong>Capítulo 15</strong> del DR-CAFTA regula de manera exhaustiva la propiedad intelectual y el régimen de limitación de responsabilidad para proveedores de servicios de Internet (ISPs) en la región centroamericana, reforzando la operatividad legal de los mecanismos de notificación y retirada.
                </li>
                <li>
                  <strong>Acuerdo sobre los Aspectos de los Derechos de Propiedad Intelectual relacionados con el Comercio (ADPIC / TRIPS) de la OMC:</strong> Garantiza estándares mínimos procesales y civiles para la observancia de la propiedad intelectual.
                </li>
              </ul>
            </div>
          </section>

          {/* Cap. 4 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              4. Política DMCA Safe Harbor y Procedimiento Formal de Notificación y Retirada (Notice and Takedown)
            </h2>
            <div className="legal-text-block">
              <p>
                Bru&apos;s Lyrics respeta de forma irrestricta los derechos de propiedad intelectual de letristas, intérpretes y casas discográficas. En cumplimiento coordinado del Título 17 del Código de los Estados Unidos (17 U.S.C. § 512 - Digital Millennium Copyright Act) y los Artículos 23-28 del Decreto No. 149-2014 de Honduras, se implementa el presente protocolo formal de Notificación y Retirada:
              </p>

              <h3>4.1. Agente Designado de Derechos de Autor</h3>
              <p>
                Para el envío de notificaciones fehacientes de presunta infracción de derechos de autor, el Agente Designado de Bru&apos;s Lyrics en la República de Honduras puede ser contactado formalmente a través de:
              </p>
              <div className="legal-contact-card">
                <p><strong>Entidad Operadora:</strong> Bru&apos;s Lyrics Legal Department</p>
                <p><strong>Dirección Legal:</strong> Colonia Palmira, Bulevar Morazán, Distrito Hotelero San Martín, Tegucigalpa, Municipio del Distrito Central, Francisco Morazán, República de Honduras.</p>
                <p><strong>Correo Electrónico Oficial:</strong> <a href="mailto:legal@bruslyrics.com" className="legal-link">legal@bruslyrics.com</a> (con copia para incidentes técnicos a <a href="mailto:abuse@bruslyrics.com" className="legal-link">abuse@bruslyrics.com</a>)</p>
                <p><strong>Tiempo de Respuesta Objetivo:</strong> 24 a 48 horas hábiles tras la recepción formal.</p>
              </div>

              <h3>4.2. Requisitos Mandatorios de una Notificación Válida</h3>
              <p>
                Para que una notificación sea procesada de forma expedita, debe constar por escrito en idioma español o inglés y contener estrictamente los siguientes elementos estatutarios:
              </p>
              <ol>
                <li>Firma física autógrafa o firma electrónica calificada de la persona autorizada para actuar en nombre del titular del derecho presuntamente infringido;</li>
                <li>Identificación exhaustiva de la obra literaria o lírica protegida cuyos derechos se alegan vulnerados (título de la canción, autor/compositor, código ISRC o editorial);</li>
                <li>Identificación precisa del material alojado en Bru&apos;s Lyrics que se alega infractor, incluyendo la URL directa, el identificador de canción (track ID) o los parámetros específicos de búsqueda;</li>
                <li>Información de contacto suficiente del reclamante: nombre completo, cargo corporativo, dirección postal física, número telefónico y dirección de correo electrónico;</li>
                <li>Declaración explícita de buena fe en la que el firmante manifieste tener la convicción justificada de que el uso impugnado no está autorizado por el titular de los derechos, su representante legal ni por la ley;</li>
                <li>Declaración solemne bajo pena de perjurio de que la información contenida en la notificación es verídica y de que el firmante está debidamente legitimado y facultado para actuar en representación del titular del derecho exclusivo presuntamente conculcado.</li>
              </ol>

              <h3>4.3. Protocolo de Contra-Notificación (Counter-Notice)</h3>
              <p>
                Si un colaborador de Bru&apos;s Lyrics considera de buena fe que su sincronización silábica fue eliminada o deshabilitada por error material o identificación errónea, podrá presentar una Contra-Notificación formal que contenga:
              </p>
              <ul>
                <li>Firma física o electrónica del colaborador;</li>
                <li>Identificación del material retirado y la ubicación en la que aparecía previamente;</li>
                <li>Declaración bajo pena de perjurio manifestando la creencia de buena fe de que el material fue retirado por error;</li>
                <li>Nombre, domicilio y teléfono del colaborador, junto con su consentimiento expreso de someterse a la jurisdicción de los Juzgados de Letras de lo Civil de Tegucigalpa, Francisco Morazán, Honduras.</li>
              </ul>
              <p>
                Tras la recepción de una Contra-Notificación válida, Bru&apos;s Lyrics remitirá copia al reclamante original. Si este último no notifica en el plazo improrrogable de diez (10) a catorce (14) días hábiles la interposición de una demanda judicial formal solicitando orden de restricción cautelar, Bru&apos;s Lyrics podrá restituir el acceso a los datos de sincronización.
              </p>

              <h3>4.4. Política de Infractores Reincidentes (Repeat Infringers)</h3>
              <p>
                Bru&apos;s Lyrics mantiene una política de tolerancia cero ante infracciones reiteradas. Los usuarios autenticados mediante Discord OAuth que acumulen múltiples advertencias o avisos de infracción fundamentados tendrán sus cuentas terminadas definitivamente, con revocación permanente del acceso al estudio de sincronización y purga de sus envíos en la base de datos.
              </p>
            </div>
          </section>

          {/* Cap. 5 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              5. Términos y Condiciones Generales de Uso (Terms of Service)
            </h2>
            <div className="legal-text-block">
              <h3>5.1. Regla de Acceso y Distribución del Servicio</h3>
              <p>
                El servicio se estructura bajo una estricta distinción de accesibilidad:
              </p>
              <ul>
                <li>
                  <strong>Búsqueda y Reproducción Abierta:</strong> La exploración de canciones, la búsqueda en catálogos y la reproducción musical en el navegador con visualización de letras sincronizadas emergentes son de acceso universal, libre y gratuito. No se requiere en ningún caso registro, suscripción de pago ni inicio de sesión para disfrutar de la experiencia de escucha.
                </li>
                <li>
                  <strong>Registro Obligatorio Exclusivo para Contribución:</strong> El inicio de sesión mediante credenciales de Discord OAuth2 es única y exclusivamente requerido para aquellos usuarios que deseen actuar como colaboradores, permitiéndoles sincronizar sílabas, ajustar cronogramas y remitir archivos TTML al catálogo comunitario.
                </li>
              </ul>

              <h3>5.2. Licencia de Contenido Generado por el Usuario (UGC)</h3>
              <p>
                Al remitir datos de temporización silábica o letras a través del estudio de sincronización, el colaborador:
              </p>
              <ul>
                <li>Declara y garantiza que las marcas de tiempo y el trabajo de estructuración temporal constituyen su propio esfuerzo original de sincronización técnica;</li>
                <li>Otorga a Bru&apos;s Lyrics una licencia mundial, no exclusiva, perpetua, irrevocable, libre de regalías y transferible para alojar, procesar, indexar, mostrar, transmitir y distribuir dichos metadatos de sincronización a través de la API y aplicaciones derivadas;</li>
                <li>Se compromete a no someter contenidos que contengan virus, código malicioso, expresiones difamatorias ni material que vulnere secretos comerciales o derechos de privacidad de terceros.</li>
              </ul>

              <h3>5.3. Exclusión de Garantías (Disclaimer of Warranties)</h3>
              <p>
                El servicio se proporciona <em>&quot;TAL CUAL&quot;</em> (<em>AS IS</em>) y <em>&quot;SEGÚN DISPONIBILIDAD&quot;</em> (<em>AS AVAILABLE</em>), sin garantías de ningún tipo, ya sean expresas o implícitas. Bru&apos;s Lyrics no garantiza que el servicio será ininterrumpido, seguro, libre de errores o que la sincronización silábica satisfaga requerimientos métricos exactos en todos los dispositivos de hardware.
              </p>

              <h3>5.4. Limitación de Responsabilidad</h3>
              <p>
                En la máxima medida autorizada por las leyes de la República de Honduras, bajo ninguna circunstancia Bru&apos;s Lyrics, sus desarrolladores, operadores ni colaboradores serán responsables por daños indirectos, incidentales, punitivos, especiales o consecuenciales derivados del uso o de la imposibilidad de uso de la plataforma o de la API.
              </p>

              <h3>5.5. Ley Aplicable y Jurisdicción Exclusiva</h3>
              <p>
                Los presentes Términos y Condiciones se rigen e interpretan en su totalidad conforme a las leyes vigentes de la República de Honduras. Cualquier litigio, controversia o reclamo resultante de o relacionado con estos términos será sometido a la competencia exclusiva e improrrogable de los <strong>Juzgados de Letras de lo Civil del Municipio del Distrito Central, Departamento de Francisco Morazán, Honduras</strong>, renunciando irrevocablemente las partes a cualquier otro fuero territorial o judicial que pudiera corresponderles.
              </p>
            </div>
          </section>

          {/* Cap. 6 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              6. Política de Privacidad y Tratamiento de Datos Personales
            </h2>
            <div className="legal-text-block">
              <p>
                Bru&apos;s Lyrics opera bajo una filosofía estricta de <em>Privacidad por Diseño</em> (<em>Privacy by Design</em>) y minimización de datos:
              </p>
              <h3>6.1. Datos Recopilados</h3>
              <p>
                La plataforma recopila únicamente los datos estrictamente indispensables para la autenticación de colaboradores mediante la API de Discord:
              </p>
              <ul>
                <li>Identificador único de usuario de Discord (Discord User ID);</li>
                <li>Nombre de usuario público (Username) y discriminador/identificador global;</li>
                <li>Avatar público de Discord (enlace CDN temporal);</li>
                <li>Dirección de correo electrónico asociada a Discord (únicamente si el usuario concede dicho alcance en el consentimiento OAuth).</li>
              </ul>
              <p>
                <strong>Constancia Expresa:</strong> Bru&apos;s Lyrics <strong>NUNCA</strong> solicita, accede, almacena ni procesa contraseñas privadas, mensajes directos de Discord, listados de servidores (guilds), canales de voz ni información financiera del usuario.
              </p>

              <h3>6.2. Finalidad del Tratamiento</h3>
              <p>
                Los datos de usuario se utilizan exclusivamente para:
              </p>
              <ul>
                <li>Autenticar la sesión del colaborador en el estudio de sincronización;</li>
                <li>Atribuir públicamente la autoría de la sincronización en los metadatos TTML (&quot;Synced by @username&quot;);</li>
                <li>Mantener el registro de reputación de colaboradores verificados y prevenir ataques automatizados o spam en la base de datos D1.</li>
              </ul>

              <h3>6.3. Almacenamiento Local y Ausencia de Rastreo de Terceros</h3>
              <p>
                No se implementan cookies invasivas de seguimiento publicitario ni píxeles espía de terceros. La plataforma utiliza el almacenamiento local del navegador (<em>localStorage</em>) únicamente para persistir el token de sesión de Discord y las preferencias del reproductor musical (nivel de volumen y velocidad de reproducción).
              </p>

              <h3>6.4. Ejercicio de Derechos ARCO (Habeas Data)</h3>
              <p>
                En armonía con el Artículo 182 de la Constitución de Honduras, cualquier usuario autenticado tiene el derecho inalienable de ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO). Para solicitar la supresión total de sus registros de usuario o la anonimización de sus créditos de sincronización, basta enviar un correo electrónico a <a href="mailto:privacy@bruslyrics.com" className="legal-link">privacy@bruslyrics.com</a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
