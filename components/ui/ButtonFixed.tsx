import React from 'react'
import { BaseComponentProps, ButtonVariant, ButtonSize, ClickHandler } from '../../lib/types'

interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  onClick?: ClickHandler
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...props
}) => {
  const baseClass = `btn-${variant}`
  const sizeClass = size === 'small' ? 'small' : ''
  
  const classes = [
    baseClass,
    sizeClass,
    disabled && 'disabled',
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={classes}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
