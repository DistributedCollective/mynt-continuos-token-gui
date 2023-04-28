import React, { useState, useCallback, useMemo } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import styled from 'styled-components'
import AmountInput from 'components/AmountInput/AmountInput'
import Anchor from 'components/Anchor/Anchor'
import ManageConversion from './ManageConversion'
import NavBar from 'components/NavBar/NavBar'
import Balance from 'components/SplitScreen/Balance'
import SplitScreen from 'components/SplitScreen/SplitScreen'
import { useWalletAugmented } from 'lib/wallet'
import { useTokenBalance } from 'lib/web3-contracts'
import { formatUnits } from 'lib/web3-utils'
import { useConvertInputs } from './useConvertInputs'

import question from './assets/question.svg'
import { COLORS, getTokenName } from 'components/utils/constants'
import { useStore } from 'components/utils/store'

const options = ['COLLATERAL', 'BONDED']

const CONVERTER_STATUSES = {
  FORM: 'STATE_FORM',
  STEPPER: 'STATE_STEPPER',
}

function ConvertForm() {
  const [formStatus, setFormStatus, setAmountSource, setIsBonded, clearState] = useStore(state => [
    state.formStatus,
    state.setFormStatus,
    state.setAmountSource,
    state.setIsBonded,
    state.clearState,
  ])
  const [selectedOption, setSelectedOption] = useState(1)
  const [inverted, setInverted] = useState(true)
  const toBonded = useMemo(() => !inverted, [inverted])
  const [legalChecked, setLegalChecked] = useState(false)
  const {
    amountSource,
    bindOtherInput,
    bondingPriceLoading,
    handleManualInputChange,
    inputValueRecipient,
    inputValueSource,
    resetInputs,
  } = useConvertInputs(options[selectedOption], toBonded)
  const tokenBalance = useTokenBalance(options[selectedOption])

  const { account } = useWalletAugmented()

  const inputDisabled = useMemo(() => !Boolean(account), [account])
  const inputError = useMemo(() => Boolean(tokenBalance.lt(amountSource)), [
    amountSource,
    tokenBalance,
  ])

  const handleLegalToggle = useCallback(() => {
    setLegalChecked(legalChecked => !legalChecked)
  }, [])

  const handleInvert = useCallback(() => {
    setInverted(inverted => !inverted)
    setSelectedOption(option => (option + 1) % 2)
  }, [])

  const handleConvertMax = useCallback(() => {
    handleManualInputChange(
      formatUnits(tokenBalance, { truncateToDecimalPlace: 3 }),
      toBonded
    )
  }, [handleManualInputChange, toBonded, tokenBalance])

  const handleConvert = useCallback((amount, isBonded) => {
    setFormStatus(CONVERTER_STATUSES.STEPPER)
    setAmountSource(amount)
    setIsBonded(isBonded)
  }, [setAmountSource, setFormStatus, setIsBonded])

  const handleReturnHome = useCallback(() => {
    resetInputs()
    clearState()
    setFormStatus(CONVERTER_STATUSES.FORM)
  }, [clearState, resetInputs, setFormStatus]);

  const submitButtonDisabled = Boolean(
    !account ||
      bondingPriceLoading ||
      !parseFloat(inputValueSource) > 0 ||
      inputError
  )

  const navbarLogoMode = useMemo(() => {
    if (formStatus !== CONVERTER_STATUSES.FORM) {
      return 'normal'
    }
    return inverted ? 'bonded' : 'collateral'
  }, [formStatus, inverted])

  return (
    <div
      css={`
        position: relative;
        height: 100vh;
      `}
    >
      <NavBar logoMode={navbarLogoMode} />
      { inputDisabled && (
        <div
          css={`
            width: 100%;
            height: 100%;
            color: ${COLORS.FONT};
            text-align: center;
            display: flex;
            justify-content: center;
            align-content: center;
            flex-direction: column;
            font-size: 32px;
          `}
        >Please connect your wallet to continue.</div>
      )} 
      {!inputDisabled && (
        <SplitScreen
          inverted={inverted}
          onInvert={handleInvert}
          primary={
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <AmountInput
                error={inputError}
                symbol={inverted ? 'BONDED' : 'COLLATERAL'}
                color={false}
                value={inputValueSource}
                disabled={inputDisabled}
                {...bindOtherInput}
              />
              <Balance
                tokenBalance={tokenBalance}
                tokenAmountToConvert={amountSource}
              />
              {account && (
                <MaxButton
                  css={`
                    margin-top: 12px;
                  `}
                  onClick={handleConvertMax}
                >
                  Convert all
                </MaxButton>
              )}
            </div>
          }
          secondary={
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <AmountInput
                symbol={inverted ? 'COLLATERAL' : 'BONDED'}
                color={true}
                value={inputValueRecipient}
                onChange={() => null}
              />
              <LabelWithOverlay
                label="The conversion amount is an estimate"
                description={`This tool uses a bonding curve to convert ${getTokenName(
                  'COLLATERAL'
                )} into ${getTokenName('BONDED')} and
                      back at a pre-defined rate. The price is calculated by an
                      automated market maker smart contract that defines a
                      relationship between token price and token supply.`}
                overlayPlacement="top"
              />
              <div
                css={`
                  position: relative;
                  width: 100vw;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding-left: 30px;
                  padding-right: 30px;
                `}
              >
                <Button disabled={submitButtonDisabled} onClick={() => handleConvert(amountSource, toBonded)}>
                  Convert
                </Button>
                <Docs />
              </div>
            </div>
          }
          reveal={
            formStatus === CONVERTER_STATUSES.STEPPER && (
              <ManageConversion
                handleReturnHome={handleReturnHome}
              />
            )
          }
        />
      )}
    </div>
  )
}

function LabelWithOverlay({ label, description, overlayPlacement }) {
  return (
    <OverlayTrigger
      delay={{ hide: 400 }}
      overlay={props => (
        <Tooltip {...props} show="true">
          {description}
        </Tooltip>
      )}
      placement={overlayPlacement}
    >
      <Label>
        {label}
        <img src={question} alt="" />
      </Label>
    </OverlayTrigger>
  )
}

function Docs() {
  return (
    <ul
      css={`
        position: absolute;
        bottom: 0px;
        right: 8px;
        list-style: none;
        color: #a0a8c2;
        font-size: 16px;
        padding: 0;
        li {
          display: inline;
          margin: 0 32px;
          a {
            color: #a0a8c2;
          }
        }
        @media screen and (max-width: 1024px) {
          position: relative;
          bottom: -32px;
        }
      `}
    >
      <li>
        <Anchor href="https://sovryn.app">Sovryn</Anchor>
      </li>
      <li>
        <Anchor href="https://wiki.sovryn.com/en/sovryn-dapp/subprotocols/mynt">
          Docs
        </Anchor>
      </li>
    </ul>
  )
}

const Button = styled.button`
  background: ${COLORS.ACCENT};
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.15);
  border: solid 0px transparent;
  border-radius: 6px;
  color: ${COLORS.FONT_BUTTON_ACCENT};
  width: 100%;
  max-width: 470px;
  height: 52px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  &:disabled,
  &[disabled] {
    opacity: 0.5;
    cursor: inherit;
  }
`

const Label = styled.label`
  font-size: 16px;
  line-height: 38px;
  color: #8a96a0;
  margin-bottom: 6px;

  span {
    color: #08bee5;
  }
  img {
    padding-left: 10px;
  }
`

const MaxButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 32px;
  margin-top: 8px;
  line-height: 32px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  color: #fff;
  background: transparent;
  border: 1px solid #fff;
  border-radius: 3px;
  cursor: pointer;
  outline: 0 !importcollateral;
  box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1);

  &:hover,
  &:active {
    outline: 0 !importcollateral;
  }
  &:focus,
  &:active {
    padding: 0;
    transform: translateY(0.5px);
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);
  }
`

export default ConvertForm
