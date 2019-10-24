// @flow

import React from "react";
import {Button} from 'react-bootstrap';
import ConfirmationModal from "../common/confirmation/ConfirmationModal.jsx";
import StepIndicatorBars from "../common/StepIndicatorBars.jsx";
import LoadingMessage from "../chrome/LoadingMessage.jsx";
import utils from "../utils/utils.js";
import GlyphStyles from "../utils/glyphs.js";


export type FormWorkflowStepConfig<T> = {|
  header: string,
  subHeader: string,
  formComponent: React$Node,
  onSubmit: (SyntheticEvent<HTMLFormElement>, HTMLFormElement, (T) => void) => void,
  onSubmitSuccess: (T) => void
|};

type Props<T> = {|
  steps: $ReadOnlyArray<FormWorkflowStepConfig>,
  formFields: T,
  isLoading: boolean
|};

type State<T> = {|
  currentStep: number,
  formIsValid: boolean,
  fieldsUpdated: boolean,
  showConfirmDiscardChanges: boolean,
  navigateToStepUponDiscardConfirmation: number,
  savedEmblemVisible: boolean,
  clickedNext: boolean,
  currentFormFields: T,
  preSubmitProcessing: ?Function
|};

/**
 * Encapsulates form for creating projects
 */
class FormWorkflow<T> extends React.PureComponent<Props<T>,State<T>> {
  constructor(props: Props): void {
    super(props);
    this.formRef = React.createRef();
    this.state = {
      currentStep: 0,
      formIsValid: false,
      fieldsUpdated: false,
      savedEmblemVisible: false,
      clickedNext: false,
      showConfirmDiscardChanges: false,
      preSubmitProcessing: null
    };
    // TODO: Replace with Guard helper function
    this.onSubmit = _.debounce(this.onSubmit.bind(this), 1000, { 'leading': true });
  }
  
  navigateToStep(step: number): void {
    if(this.state.fieldsUpdated) {
      this.setState({
        navigateToStepUponDiscardConfirmation: step,
        showConfirmDiscardChanges: true,
        savedEmblemVisible: false
      });
    } else {
      this.setState(Object.assign(this.resetPageState(), {
        currentStep: step,
        savedEmblemVisible: false
      }), utils.navigateToTopOfPage);
      this.forceUpdate();
    }
  }
  
  resetPageState(state: ?State): State {
    let _state: State = state || this.state;
    return Object.assign(_state, {
      fieldsUpdated: false,
      formIsValid: false
    });
  }
  
  onValidationCheck(formIsValid: boolean, preSubmitProcessing: Function): void {
    if (formIsValid !== this.state.formIsValid) {
      this.setState({formIsValid});
    }
    
    if (preSubmitProcessing !== this.state.preSubmitProcessing) {
      this.setState({preSubmitProcessing});
    }
  }
  
  onFormUpdate(formFields: {||}) {
    if (!this.state.clickedNext && !_.isEqual(this.state.currentFormFields, formFields)) {
      this.setState({savedEmblemVisible: false});
    }
    this.setState({fieldsUpdated: true, currentFormFields: formFields});
  }
  
  confirmDiscardChanges(confirmDiscard: boolean): void {
    let confirmState: State = this.state;
    confirmState.showConfirmDiscardChanges = false;
    if(confirmDiscard) {
      confirmState.currentStep = this.state.navigateToStepUponDiscardConfirmation;
      confirmState = this.resetPageState(confirmState);
    }
    
    this.setState(confirmState);
    this.forceUpdate(utils.navigateToTopOfPage);
  }
  
  onSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const currentStep: FormWorkflowStepConfig = this.props.steps[this.state.currentStep];
    const submitFunc: Function = () => {
      currentStep.onSubmit(event, this.formRef, this.onSubmitSuccess.bind(this, currentStep.onSubmitSuccess));
    };
    this.state.preSubmitProcessing ? this.state.preSubmitProcessing(submitFunc) : submitFunc();
  }
  
  onSubmitSuccess(onStepSubmitSuccess: (T) => void, formFields: T) {
    onStepSubmitSuccess(formFields);
    this.setState(this.resetPageState({
      clickedNext: false,
      currentStep: this.state.currentStep + 1,
      savedEmblemVisible: true
    }));
  }
  
  render(): React$Node {
    const currentStep: FormWorkflowStepConfig = this.props.steps[this.state.currentStep];
    
    return (
      <React.Fragment>
        <ConfirmationModal
          showModal={this.state.showConfirmDiscardChanges}
          message="You have unsaved changes on this form.  Do you want to discard these changes?"
          onSelection={this.confirmDiscardChanges.bind(this)}
        />
        
        <div className="create-form white-bg container-fluid">
          <div className="bounded-content">
            <h1>{currentStep.header}</h1>
            <h2>{currentStep.subHeader}</h2>
            <StepIndicatorBars
              stepCount={this.props.steps.length + 1}
              currentlySelected={this.state.currentStep}
            />
          </div>
        </div>
  
        {this.props.isLoading ? <LoadingMessage /> : this._renderForm()}

      </React.Fragment>
    );
  }
  
  _renderForm(): React$Node {
    const FormComponent: React$Node = this.props.steps[this.state.currentStep].formComponent;
  
    return (
      <form
        onSubmit={this.onSubmit.bind(this)}
        method="post"
        ref={this.formRef}>
    
        <div className="create-form grey-bg container">
          {/*TODO: Rename projects prop to something generic*/}
          <FormComponent
            project={this.props.formFields}
            readyForSubmit={this.onValidationCheck.bind(this)}
            onFormUpdate={this.onFormUpdate.bind(this)}
          />
        </div>
    
        <div className="create-form white-bg container-fluid">
      
          <Button className="btn btn-theme"
                  type="button"
                  title="Back"
                  disabled={this.onFirstStep()}
                  onClick={this.navigateToStep.bind(this, this.state.currentStep - 1)}
          >
            Back
          </Button>
      
          <div className="form-group pull-right">
            <div className='text-right'>
              {!this.state.savedEmblemVisible ? "" :
                <span className='create-project-saved-emblem'><i className={GlyphStyles.CircleCheck} aria-hidden="true"></i> Saved</span>}
               
              <input type="submit" className="btn_outline save_btn_create_project"
                    disabled={!this.state.formIsValid}
                    value={this.onLastStep() ? "PUBLISH" : "Next"}
              />
            </div>
          </div>
        </div>
      </form>
    );
  }
  
  onLastStep(): boolean {
    return this.state.currentStep >= this.props.steps.length - 1;
  }

  onFirstStep(): boolean {
    return this.state.currentStep === 0;
  }
}

export default FormWorkflow;