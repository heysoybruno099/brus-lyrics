import React from 'react';

export const LegalDocumentation: React.FC = () => {
  return (
    <div className="legal-page-container">
      <div className="legal-page-inner">
        {/* Header Banner */}
        <div className="legal-hero-header">
          <div className="legal-badge-pill">
            <span>GLOBAL &amp; INTERNATIONAL JURISDICTION</span>
          </div>
          <h1 className="legal-main-title">
            International Legal Framework, Terms of Service &amp; Intermediary Safe Harbor
          </h1>
          <p className="legal-main-sub">
            Comprehensive binding legal terms and copyright safe harbor protections governing the lyrics synchronization platform. Operating under international copyright treaties, multilateral conventions, and statutory digital intermediary safe harbors worldwide.
          </p>
          <div className="legal-meta-strip">
            <span>Applicable Framework: Berne Convention • WIPO WCT • US DMCA 512 • EU DSM Directive</span>
            <span className="meta-sep">•</span>
            <span>Effective Date: November 8, 2026</span>
          </div>
        </div>


        {/* Content Body */}
        <div className="legal-sections-wrapper">
          {/* Section 1 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              1. International Legal Foundation &amp; Multilateral Treaties
            </h2>
            <div className="legal-text-block">
              <p>
                This platform operates as an automated, technological intermediary and precision metadata engine. All operations, user contributions, and synchronization protocols are governed by recognized international conventions and multilateral treaties:
              </p>
              <h3>1.1. The Berne Convention for the Protection of Literary and Artistic Works (Paris Act 1971)</h3>
              <p>
                Under <strong>Article 2</strong> of the Berne Convention, musical lyrics constitute protected literary works. We fully recognize that underlying musical lyrics remain the exclusive intellectual property of their respective songwriters, lyricists, publishers, and collective management organizations (CMOs).
              </p>
              <p>
                In strict adherence to <strong>Article 6bis</strong> of the Berne Convention, we protect and uphold the moral rights of authors, specifically the right of attribution (paternity) and integrity. All synchronization metadata tracks preserve author and composer credits, displaying original artist information prominently.
              </p>

              <h3>1.2. WIPO Copyright Treaty (WCT 1996)</h3>
              <p>
                Under <strong>Articles 4, 5, and 8</strong> of the WIPO Copyright Treaty, digital metadata, synchronization timestamps, and communications to the public via global computer networks are recognized. The platform functions strictly as an interactive timing engine and technological conduit, providing descriptive temporal markup (TTML / LRC) without claiming ownership over underlying copyrighted musical compositions.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              2. Digital Millennium Copyright Act (DMCA 17 U.S.C. § 512) Safe Harbor
            </h2>
            <div className="legal-text-block">
              <p>
                This service qualifies as an online service provider under the safe harbor provisions of Title II of the Digital Millennium Copyright Act (17 U.S.C. § 512). As an interactive platform hosting user-submitted lyrics and synchronization timing data, we maintain a strict Notice and Takedown compliance mechanism.
              </p>
              <h3>2.1. Notice and Takedown Procedure (17 U.S.C. § 512(c)(3))</h3>
              <p>
                Copyright owners or their authorized agents who believe that any lyric transcriptions, TTML synchronization files, or catalog entries infringe upon their exclusive rights may submit a formal notification containing:
              </p>
              <ol>
                <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed;</li>
                <li>Identification of the copyrighted work claimed to have been infringed, including track title, artist name, and ISRC if available;</li>
                <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity and that is to be removed, including specific URLs or catalog identifiers;</li>
                <li>Information reasonably sufficient to permit us to contact the complaining party, such as an address, telephone number, and email address;</li>
                <li>A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law;</li>
                <li>A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
              </ol>
              <p>
                Takedown notices should be transmitted to our designated notification agent via our contact channels. Upon receipt of a valid notice, we act expeditiously to remove or disable access to the contested material.
              </p>

              <h3>2.2. Counter-Notification Procedure (17 U.S.C. § 512(g))</h3>
              <p>
                If a contributor believes their submitted transcription was removed by mistake or misidentification, they may submit a formal written counter-notice complying with 17 U.S.C. § 512(g)(3). Upon receiving a valid counter-notice, the material may be restored within 10 to 14 business days unless the original claimant files a court action.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              3. European Union Copyright Framework (Directive 2019/790 &amp; Directive 2001/29/EC)
            </h2>
            <div className="legal-text-block">
              <p>
                For users and rights holders located within the European Union, the platform observes the standards established under <strong>Directive (EU) 2019/790</strong> on copyright and related rights in the Digital Single Market (DSM Directive) and <strong>Directive 2001/29/EC</strong> (Information Society Directive):
              </p>
              <ul>
                <li>
                  <strong>Article 17 Intermediary Obligations:</strong> The platform acts in good faith to prevent unauthorized dissemination of full phonograms. The service streams only brief, publicly available audio samples or synthetic timing reference tones, and does not sell or distribute sound recording masters.
                </li>
                <li>
                  <strong>Exceptions and Quotation Rights:</strong> In accordance with Article 5(3)(d) of Directive 2001/29/EC, quotation, research, transformative synchronization, and educational lyric study are respected.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              4. Fair Dealing, Transformative Synchronization &amp; Technological Neutrality
            </h2>
            <div className="legal-text-block">
              <p>
                The synchronized lyrics provided on this platform (TTML, syllable markers, and LRC data) constitute mathematical timestamp coordinates and textual representations designed to synchronize reading with audio playback.
              </p>
              <p>
                Under comparative international fair dealing doctrines (including Section 107 of the US Copyright Act and UK Copyright, Designs and Patents Act 1988), precision syllable synchronization serves substantial transformative, accessibility, and educational purposes:
              </p>
              <ul>
                <li><strong>Accessibility:</strong> Enables deaf and hard-of-hearing individuals to experience real-time musical lyrics with synchronized syllable pacing.</li>
                <li><strong>Language Learning:</strong> Facilitates pronunciation and language acquisition through visible, word-level phonetic tracking.</li>
                <li><strong>Non-Commercial Operation:</strong> Access to the catalog and browser playback is provided openly without subscription fees or commercial gating.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              5. Contributor Code of Conduct &amp; Authenticated Submissions
            </h2>
            <div className="legal-text-block">
              <p>
                Contributing, creating, or editing synchronization files requires Discord OAuth verification. By submitting TTML XML, LRC, or JSON data to this service, contributors warrant that:
              </p>
              <ol>
                <li>All submissions reflect accurate, good-faith transcription of publicly released lyrics;</li>
                <li>Submissions do not contain malware, advertising, automated spam, defamatory text, or unauthorized third-party personal data;</li>
                <li>The contributor grants the platform a worldwide, non-exclusive, royalty-free license to host, format, cache, and transmit the timing metadata to client applications and open-source extensions.</li>
              </ol>
            </div>
          </section>

          {/* Section 6 - Privacy Policy */}
          <section className="legal-section">
            <h2 className="legal-section-heading">
              6. Privacy Policy &amp; Data Protection
            </h2>
            <div className="legal-text-block">
              <p>
                We value your privacy and comply with global privacy standards, including GDPR and CCPA principles.
              </p>
              <p>
                Our official privacy policy is maintained and hosted at <strong style={{ color: '#f4f4f6' }}>heysoybruno099</strong>.
              </p>
              <div style={{ marginTop: 14, padding: 16, backgroundColor: '#141418', borderRadius: 6, border: '1px solid #26262e' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#e4e4e7' }}>
                  Please review the complete, authoritative Privacy Policy at:
                </p>
                <p style={{ margin: '8px 0 0 0' }}>
                  <a
                    href="https://github.com/heysoybruno099"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#4ade80', textDecoration: 'underline', fontWeight: 600, fontSize: 14 }}
                  >
                    https://github.com/heysoybruno099 (heysoybruno099 Official Privacy Policy)
                  </a>
                </p>
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentation;
