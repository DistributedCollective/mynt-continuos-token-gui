import React, { useCallback, useState, useEffect, useReducer } from 'react'
import PropTypes from 'prop-types'
import {
  STEPPER_IN_PROGRESS,
  STEPPER_SUCCESS,
  STEPPER_ERROR,
  STEP_WAITING,
  STEP_WORKING,
  STEP_SUCCESS,
  STEP_ERROR,
} from './stepper-statuses'
import Divider from './Divider'
import Step from './Step'
import StepperLayout from './StepperLayout'
import StepperTitle from './StepperTitle'
import useStepLayout from './useStepLayout'
import { COLORS } from 'components/utils/constants'
import { useStore } from 'components/utils/store'

function initialStepState(steps) {
  return steps.map((step) => {
    return {
      status: STEP_WAITING,
      hash: null,
      active: false,
      name: step[1].name
    }
  })
}

function ConvertSteps({
  toBonded,
  fromAmount,
  convertedTotal,
  onReturnHome,
  steps,
}) {
  const [stepperBoundsRef, stepLayoutName] = useStepLayout({
    boundsOffset: 100,
  })

  const {
    stepperStage,
    setStepperStage,
    savedSteps,
    stepperStatus,
    setStepperStatus,
    setSteps,
    setStepActive,
    setStepStatus,
    setActiveStage: setActiveStep,
    setStepHash,
  } = useStore()

  const setInitialSteps = useCallback(() => {
    setSteps(initialStepState(steps))
    setStepperStatus(STEPPER_IN_PROGRESS)
  }, [setStepperStatus, setSteps, steps]);

  useEffect(() => {
    if (savedSteps.length > 0) return
    setInitialSteps()
  }, [savedSteps.length, setInitialSteps])

  const attemptStepSigning = useCallback(
    async (stepIndex, retry) => {
      const currentStep = savedSteps[stepIndex]
      if (!currentStep) return
      const {
        onHashCreated,
        onTxCreated,
        onOrderClaim,
        onResumeWait,
        onTxMined,
        onWaitCondition,
        onWaitForTx,
      } = steps[stepIndex][1]

      const { hash, status } = currentStep

      if (status === STEP_ERROR && !retry) {
        return
      }

      try {
        setStepActive(stepIndex)
        if (!hash && onTxCreated) {
          setStepStatus(stepIndex, STEP_WAITING)
          // Awaiting confirmation
          const transaction = await onTxCreated()

          onHashCreated && onHashCreated(transaction.hash)
          setStepHash(stepIndex, transaction.hash)

          // Mining transaction
          setStepStatus(stepIndex, STEP_WORKING)

          await transaction.wait()

          onTxMined && (await onTxMined(transaction.hash))
        }
       
        if (!hash && onOrderClaim) {
          setStepStatus(stepIndex, STEP_WAITING)
          // Awaiting confirmation
          const { hash } = savedSteps[stepIndex - 2] // searching for openOrderTransactionHash to hold 
          const transaction = await onOrderClaim(hash)

          onHashCreated && onHashCreated(transaction.hash)
          setStepHash(stepIndex, transaction.hash)

          // Mining transaction
          setStepStatus(stepIndex, STEP_WORKING)

          await transaction.wait()

          onTxMined && (await onTxMined(transaction.hash))
        }

        if (hash && status === STEP_WORKING && onResumeWait) {
          await onResumeWait(hash)
        }

        if (hash && status === STEP_WORKING && onWaitForTx) {
          await onWaitForTx(hash)
        }

        if (onWaitCondition) {
          const { hash } = savedSteps[stepIndex - 1] // searching for openOrderTransactionHash to hold 
          await onWaitCondition(hash)
        }

        // Success
        setStepStatus(stepIndex, STEP_SUCCESS)

        // Activate next step or show as completed
        if (stepperStage < steps.length - 1) {
          setActiveStep(stepperStage + 1)
        } else {
          setStepperStatus(STEPPER_SUCCESS)
        }
      } catch (err) {
        // If there's a problem mining the transaction we catch it
        // and visually feedback to the user
        setStepStatus(stepIndex, STEP_ERROR)
        setStepperStatus(STEPPER_ERROR)
        console.error(err)
      }
    },
    [savedSteps, steps, setStepActive, setStepStatus, stepperStage, setStepHash, setActiveStep, setStepperStatus]
  )

  const handleRetrySigning = () => {
    setStepperStatus(STEPPER_IN_PROGRESS)
    setStepStatus(stepperStage, STEP_WAITING)
    attemptStepSigning(stepperStage, true)
  }

  useEffect(() => {
    attemptStepSigning(stepperStage)
  }, [stepperStage, savedSteps.length, attemptStepSigning])

  const renderStep = (stepIndex, renderDivider) => (
    <li
      key={stepIndex}
      css={`
        display: flex;
      `}
    >{
        savedSteps && savedSteps[stepIndex] && <Step
        title={steps[stepIndex][0]}
        number={stepIndex + 1}
        active={savedSteps[stepIndex].active}
        status={savedSteps[stepIndex].status}
        transactionHash={savedSteps[stepIndex].hash}
        showDesc={steps[stepIndex][1].showDesc}
      />
    }
      {renderDivider && <Divider />}
    </li>
  )

  const renderSteps = () => {
    return steps.map((_, index) => {
      const renderDivider = index !== steps.length - 1

      return renderStep(index, renderDivider)
    })
  }

  return (
    <StepperLayout
      status={stepperStatus}
      onRepeatTransaction={handleRetrySigning}
      onReturnHome={onReturnHome}
      disableAbandon={steps[stepperStage][1].disableAbandon || false}
      titleArea={
        <div
          css={`
            text-align: center;
          `}
        >
          <h1
            css={`
              ${stepLayoutName === 'large' && 'margin-bottom: 80px'};
              color: ${COLORS.FONT};
              text-align: center;
              padding-left: 40px;
              padding-right: 40px;
            `}
          >
            {/* <StepperTitle
              fromAmount={fromAmount}
              convertedTotal={convertedTotal}
              toBonded={toBonded}
              status={stepperStatus}
            /> */}
          </h1>

          {stepLayoutName === 'small' && (
            <p
              css={`
                margin-top: 5px;
                margin-bottom: 50px;
                color: ${COLORS.FONT};
              `}
            >
              {stepperStage + 1} out of {steps.length} transactions
            </p>
          )}
        </div>
      }
    >
      <div
        css={`
          display: flex;
          justify-content: center;
          width: 100%;
        `}
      >
        <ul
          ref={stepperBoundsRef}
          css={`
            padding: 0;
            display: flex;
          `}
        >
          {stepLayoutName === 'small' && renderStep(stepperStage)}
          {stepLayoutName === 'large' && renderSteps()}
        </ul>
      </div>
    </StepperLayout>
  )
}

ConvertSteps.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.array),
  fromAmount: PropTypes.object,
  convertedTotal: PropTypes.object,
  toBonded: PropTypes.bool,
  onReturnHome: PropTypes.func,
}

export default ConvertSteps
