import ReactMarkdown from "react-markdown";
import configData from "../config.json";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-site">
        <ReactMarkdown children={configData.FOOTER.SITE_NOTE_MARKDOWN} />
      </div>
      <div className="footer-bottom">
        <div className="footer-copyright">
          <ReactMarkdown children={configData.FOOTER.COPYRIGHT_MARKDOWN} />
        </div>
        <div className="footer-conclar">
          <ReactMarkdown children={configData.FOOTER.CONCLAR_NOTE_MARKDOWN} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
