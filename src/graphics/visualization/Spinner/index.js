import './index.scss';

export default {
  view() {
    return <div className="escoSpinner" >
      <div className="spinner-border" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    </div>;
  },
};
