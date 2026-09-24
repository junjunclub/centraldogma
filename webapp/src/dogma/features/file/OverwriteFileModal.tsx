import {
  Button,
  Code,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';

export const OverwriteFileModal = ({
  isOpen,
  onClose,
  path,
  onOverwrite,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  path: string;
  onOverwrite: () => void;
  isLoading: boolean;
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>File already exists</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          A file with the same name already exists at <Code>{path}</Code>. Do you want to overwrite it?
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button colorScheme="red" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onOverwrite} isLoading={isLoading} loadingText="Overwriting">
              Overwrite
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
