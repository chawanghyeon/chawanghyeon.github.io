import React, { useRef } from 'react'
import { BaseComponentProps, FileChangeHandler } from '../../lib/types'
import Button from './Button'

interface FileInputProps extends BaseComponentProps {
  accept?: string
  onChange: FileChangeHandler
  buttonLabel: string
  buttonVariant?: 'primary' | 'muted' | 'link' | 'danger'
  buttonSize?: 'small' | 'medium' | 'large'
  multiple?: boolean
}

const FileInput: React.FC<FileInputProps> = ({
  accept,
  onChange,
  buttonLabel,
  buttonVariant = 'muted',
  buttonSize = 'small',
  multiple = false,
  className = '',
  ...props
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    onChange(file)
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className} {...props}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleButtonClick}
      >
        {buttonLabel}
      </Button>
    </div>
  )
}

export default FileInput
