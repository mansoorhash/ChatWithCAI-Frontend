import type { ReactElement } from "react";

import "./copyrightPage.css";

type LegalList = Readonly<{
  ordered: boolean;
  introduction: string;
  items: readonly string[];
}>;

type LegalSection = Readonly<{
  id: string;
  title: string;
  paragraphs: readonly string[];
  list?: LegalList;
  showContact?: boolean;
  closingParagraph?: string;
}>;

const legalSections: readonly LegalSection[] = [
  {
    id: "ownership",
    title: "1. Ownership of the Service",
    paragraphs: [
      "Unless otherwise stated, the original software, source code, database structure, functionality, interface and website designs, branding, graphics, text, and other materials created for CAI and provided through chatwithcai.com or api.chatwithcai.com (collectively, the “Service”) are owned by Mansoor Hashemi or used under licence. These materials are protected by applicable copyright, trademark, and other intellectual property laws.",
      "This ownership does not extend to User Content, AI-generated responses, or third-party materials.",
    ],
  },
  {
    id: "permitted-use",
    title: "2. Permitted Use",
    paragraphs: [
      "You may access and use the Service for personal, non-commercial use or an internal business purpose in accordance with our Terms of Service. This permission is limited, non-exclusive, non-transferable, and revocable.",
    ],
    list: {
      ordered: false,
      introduction:
        "Except as permitted by our Terms of Service or applicable law, without prior written permission you may not:",
      items: [
        "Copy, reproduce, aggregate, republish, upload, post, publicly display, encode, translate, transmit, distribute, sell, license, or otherwise exploit the Service or CAI-owned materials.",
        "Resell, sublicense, or provide another person with unauthorized access to the Service.",
        "Remove copyright, trademark, attribution, or other proprietary notices.",
        "Use CAI names, logos, or branding in a way that suggests sponsorship, endorsement, or affiliation.",
      ],
    },
  },
  {
    id: "user-content",
    title: "3. Your Content",
    paragraphs: [
      "You retain any intellectual property rights you hold in prompts, messages, code, files, and other content you submit through the Service (“User Content”). Your use of the Service does not transfer ownership of your User Content to us. The limited licences needed to operate the Service and, when enabled, use eligible User Content for model training are described in our Terms of Service and Privacy Policy.",
      "Comments, suggestions, ideas, feedback, and other information specifically about the Service are “Submissions,” not User Content, and are governed by the separate Submissions terms in our Terms of Service.",
      "You are responsible for ensuring that your User Content does not infringe another person's copyright or other rights.",
    ],
  },
  {
    id: "ai-output",
    title: "4. AI-Generated Output",
    paragraphs: [
      "Subject to our Terms of Service, applicable law, and third-party rights, you may use AI-generated responses produced for you. To the extent CAI acquires any intellectual property rights in a response generated specifically for you, CAI assigns those rights to you.",
      "AI-generated responses may not be unique, and other users may receive identical or similar responses. We do not guarantee that a response qualifies for copyright protection or is free from third-party rights. You are responsible for reviewing responses before publishing, selling, or otherwise using them.",
    ],
  },
  {
    id: "third-party",
    title: "5. Third-Party Materials",
    paragraphs: [
      "The Service may refer to or display third-party names, logos, trademarks, content, libraries, or services. Those materials remain the property of their respective owners. Their appearance on CAI does not imply sponsorship or endorsement unless expressly stated.",
    ],
  },
  {
    id: "dmca-agent",
    title: "6. DMCA Designated Agent",
    paragraphs: [
      "CAI has designated the following agent to receive notifications of claimed copyright infringement under the Digital Millennium Copyright Act:",
      "Name: Mansoor Hashemi",
      "Address: 415 Willowdale Ave, North York, Ontario M2N 5B4, Canada",
      "Telephone: +1 (647) 366-7572",
      "Email: copyright@chatwithcai.com",
    ],
  },
  {
    id: "reporting",
    title: "7. Reporting Copyright Infringement",
    paragraphs: [],
    list: {
      ordered: true,
      introduction:
        "If you believe material available through the Service infringes a copyright you own or control, send our designated agent a written notice containing:",
      items: [
        "A physical or electronic signature of the copyright owner or a person authorized to act on the owner's behalf.",
        "Identification of the copyrighted work claimed to have been infringed or, if multiple works at one online site are covered, a representative list of those works.",
        "Identification of the material claimed to be infringing and information reasonably sufficient for us to locate it, including the exact URL when available.",
        "Information reasonably sufficient for us to contact you, including your name, mailing address, telephone number, and email address.",
        "A statement that you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.",
        "A statement that the information in your notice is accurate and, under penalty of perjury, that you are authorized to act on behalf of the owner of the allegedly infringed exclusive right.",
      ],
    },
    showContact: true,
    closingParagraph:
      "We will respond expeditiously to a substantially compliant notice by removing or disabling access to the identified material when required and will take reasonable steps to notify the affected user. Knowingly materially misrepresenting that material is infringing may result in liability under 17 U.S.C. § 512(f).",
  },
  {
    id: "counter-notice",
    title: "8. Counter-Notification",
    paragraphs: [
      "If material you supplied was removed or disabled because of a copyright notice and you believe that action resulted from a mistake or misidentification, you may send our designated agent a written counter-notification containing:",
    ],
    list: {
      ordered: true,
      introduction: "",
      items: [
        "Your physical or electronic signature.",
        "Identification of the material that was removed or disabled and the location where it appeared before removal or disabling.",
        "A statement under penalty of perjury that you have a good-faith belief the material was removed or disabled because of a mistake or misidentification.",
        "Your name, address, and telephone number.",
        "A statement consenting to the jurisdiction of the appropriate United States Federal District Court, or, if your address is outside the United States, any judicial district where the service provider may be found.",
        "A statement that you will accept service of process from the person who submitted the original notice or that person's agent.",
      ],
    },
    showContact: true,
    closingParagraph:
      "After receiving a valid counter-notification, we will provide a copy to the original complainant and state that we will restore the material in ten business days. We will restore the material between ten and fourteen business days after receiving the counter-notification unless our designated agent first receives notice that the complainant has filed a court action seeking to restrain the alleged infringement.",
  },
  {
    id: "repeat-infringers",
    title: "9. Repeat Infringers",
    paragraphs: [
      "In appropriate circumstances, CAI may terminate accounts belonging to users who repeatedly infringe copyrights. We may also remove or restrict access to User Content that we reasonably believe infringes another person's rights.",
    ],
  },
  {
    id: "permission",
    title: "10. Permission Requests",
    paragraphs: [
      "To request permission to use CAI branding or other protected materials beyond the uses allowed above, contact copyright@chatwithcai.com and describe the material and your intended use.",
    ],
  },
];

export default function CopyrightPage(): ReactElement {
  return (
    <main className="copyright-page">
      <div className="copyright-shell">
        <header className="copyright-hero">
          <p className="copyright-eyebrow">Legal</p>
          <h1 className="copyright-title">
            Copyright &amp; intellectual property
          </h1>
          <p className="copyright-intro">
            Information about ownership of the CAI service, acceptable use of
            our materials, and how to report a copyright concern.
          </p>
          <p className="copyright-updated">Last updated: August 15, 2026</p>
        </header>

        <article className="copyright-document">
          {legalSections.map((section) => {
            const ListElement = section.list?.ordered ? "ol" : "ul";

            return (
              <section
                className="copyright-section"
                aria-labelledby={`copyright-${section.id}`}
                key={section.id}
              >
                <h2
                  className="copyright-section-title"
                  id={`copyright-${section.id}`}
                >
                  {section.title}
                </h2>

                {section.paragraphs.map((paragraph) => (
                  <p className="copyright-paragraph" key={paragraph}>
                    {paragraph}
                  </p>
                ))}

                {section.list && (
                  <>
                    <p className="copyright-paragraph">
                      {section.list.introduction}
                    </p>
                    <ListElement
                      className={`copyright-list${
                        section.list.ordered
                          ? " copyright-list-numbered"
                          : ""
                      }`}
                    >
                      {section.list.items.map((item) => (
                        <li className="copyright-list-item" key={item}>
                          {item}
                        </li>
                      ))}
                    </ListElement>
                  </>
                )}

                {section.showContact && (
                  <aside className="copyright-contact-card">
                    <p className="copyright-contact-label">
                      Send copyright notices to
                    </p>
                    <a
                      className="copyright-email-link"
                      href="mailto:copyright@chatwithcai.com?subject=Copyright%20notice"
                    >
                      copyright@chatwithcai.com
                    </a>
                  </aside>
                )}

                {section.closingParagraph && (
                  <p className="copyright-paragraph">
                    {section.closingParagraph}
                  </p>
                )}
              </section>
            );
          })}
        </article>
      </div>
    </main>
  );
}