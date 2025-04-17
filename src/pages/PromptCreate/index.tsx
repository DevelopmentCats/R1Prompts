import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  Stack,
  Textarea,
  Select,
  useToast,
  Switch,
  Text,
  Flex,
  Tag,
  TagLabel,
  TagCloseButton,
  Image,
  SimpleGrid,
  IconButton,
} from '@chakra-ui/react';
import { useState, useRef, memo } from 'react';
import { FiUpload, FiX } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { PromptCategory, CATEGORY_DISPLAY_NAMES } from '../../types/prompt';

interface PromptForm {
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  isPublic: boolean;
  tags: string[];
  imageUrls: string[];
}

// Memoized ImagePreview component
const ImagePreview = memo(({ 
  imageUrls, 
  onRemove 
}: { 
  imageUrls: string[], 
  onRemove: (url: string) => void 
}) => {
  return (
    <SimpleGrid columns={[1, 2, 3]} spacing={4}>
      {imageUrls.map((url, index) => (
        <Box key={index} position="relative">
          <Image
            src={url.startsWith('/')
              ? `${import.meta.env.VITE_API_URL}${url}`
              : url.startsWith('http')
              ? url
              : `${import.meta.env.VITE_API_URL}/${url}`}
            alt={`Preview ${index + 1}`}
            borderRadius="md"
            objectFit="cover"
            w="100%"
            h="150px"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <IconButton
            aria-label="Remove image"
            icon={<FiX />}
            size="sm"
            position="absolute"
            top={2}
            right={2}
            onClick={() => onRemove(url)}
          />
        </Box>
      ))}
    </SimpleGrid>
  );
});

const PromptCreate = () => {
  const [form, setForm] = useState<PromptForm>({
    title: '',
    description: '',
    content: '',
    category: PromptCategory.general,
    isPublic: true,
    tags: [],
    imageUrls: [],
  });
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createPromptMutation = useMutation({
    mutationFn: async (promptData: PromptForm) => {
      try {
        const response = await axiosInstance.post('/prompts', promptData);
        return response.data;
      } catch (error: any) {
        const message = error.response?.data?.message || 'Error creating prompt';
        throw new Error(message);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Prompt created successfully!',
        status: 'success',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['userPrompts'] });
      navigate(`/prompts/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create prompt',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = () => {
    setForm((prev) => ({
      ...prev,
      isPublic: !prev.isPublic,
    }));
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!form.tags.includes(newTag.trim())) {
        setForm((prev: PromptForm) => ({
          ...prev,
          tags: [...prev.tags, newTag.trim()]
        }));
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev: PromptForm) => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    setIsUploading(true);
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Upload to the prompts endpoint with just the image
      const response = await axiosInstance.post('/prompts/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, response.data.url]
      }));

      toast({
        title: 'Image uploaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error uploading image',
        description: error.response?.data?.message || 'Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter(url => url !== urlToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Include imageUrls in the form data
      const promptData = {
        ...form,
        imageUrls: form.imageUrls // Make sure to send the imageUrls array
      };
      await createPromptMutation.mutateAsync(promptData);
    } catch (error) {
      // Error is handled by mutation error callback
    }
  };

  return (
    <Container maxW="container.md" py={20}>
      <Box
        bg="brand.800"
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Heading size="xl">Create a New Prompt</Heading>
            <Text color="gray.400">
              Share your R1 prompt with the community
            </Text>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Give your prompt a clear, descriptive title"
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  bg="brand.700"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'accent.500',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                >
                  {Object.values(PromptCategory).map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_DISPLAY_NAMES[value]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {form.category === PromptCategory['generative-ui'] && (
                <FormControl>
                  <FormLabel>Upload Images</FormLabel>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                  />
                  <Button
                    leftIcon={<FiUpload />}
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploading}
                    mb={4}
                  >
                    Upload Image
                  </Button>
                  {form.imageUrls.length > 0 && (
                    <ImagePreview
                      imageUrls={form.imageUrls}
                      onRemove={handleRemoveImage}
                    />
                  )}
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'orange.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-orange-500)',
                  }}
                />
                {form.tags.length > 0 && (
                  <Flex wrap="wrap" gap={2} mt={2}>
                    {form.tags.map((tag) => (
                      <Tag
                        key={tag}
                        size="md"
                        borderRadius="full"
                        variant="solid"
                        colorScheme="orange"
                        bg="whiteAlpha.200"
                        color="white"
                      >
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton 
                          onClick={() => handleRemoveTag(tag)}
                          _hover={{
                            bg: 'whiteAlpha.300',
                          }}
                        />
                      </Tag>
                    ))}
                  </Flex>
                )}
                <FormHelperText>
                  Add tags to help others find your prompt (press Enter after each tag)
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Provide a brief description of what your prompt does"
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                  rows={3}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Prompt Content</FormLabel>
                <Textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Enter your prompt here..."
                  bg="brand.700"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{
                    borderColor: 'whiteAlpha.300',
                  }}
                  _focus={{
                    borderColor: 'accent.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)',
                  }}
                  rows={8}
                />
                <FormHelperText>
                  Format your prompt carefully for the best results
                </FormHelperText>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="isPublic" mb="0">
                  Make this prompt public?
                </FormLabel>
                <Switch
                  id="isPublic"
                  isChecked={form.isPublic}
                  onChange={handleSwitchChange}
                  colorScheme="orange"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="orange"
                size="lg"
                fontSize="md"
              >
                Create Prompt
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Container>
  );
};

export default PromptCreate;
