import footerHtml from "virtual:footer-html";

const Footer = () => {
  return (
    <footer className="footer">
      <div
        className="footer-site"
        dangerouslySetInnerHTML={{ __html: footerHtml.site }}
      />
      <div
        className="footer-copyright"
        dangerouslySetInnerHTML={{ __html: footerHtml.copyright }}
      />
      <div
        className="footer-conclar"
        dangerouslySetInnerHTML={{ __html: footerHtml.conclar }}
      />
    </footer>
  );
};

export default Footer;
