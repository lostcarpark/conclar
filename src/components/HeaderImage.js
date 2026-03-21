import configData from "../config.json";

const headerImg = configData.HEADER.IMG_SRC ? <img src={configData.HEADER.IMG_SRC} alt={configData.HEADER.IMG_ALT_TEXT}></img> : "";
const showBreak = configData.HEADER.LINEFEED_AFTER_URL ? <br /> : "";

const HeaderImage = () => {
  return (
    <>
      {headerImg}
      {showBreak}
    </>
  );
};

export default HeaderImage;
