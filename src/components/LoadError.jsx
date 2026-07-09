import configData from "../config.json";

const LoadError = () => (
  <div className="load-error">
    <h1>{configData.APPLICATION.LOADING.MESSAGE}</h1>
    <p>Sorry, the program could not be loaded.</p>
  </div>
);

export default LoadError;
