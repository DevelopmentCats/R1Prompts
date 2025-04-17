import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  FormErrorMessage,
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
  useColorModeValue,
  Image,
  SimpleGrid,
  IconButton,
} from '@chakra-ui/react';
import { FiUpload, FiX } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { PromptCategory, CATEGORY_DISPLAY_NAMES } from '../types/prompt';
import SEO from '../components/SEO';

interface CreatePromptForm {
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  isPublic: boolean;
  tags: string[];
  imageUrls: string[];
}

interface FormErrors {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
}

const initialFormState: CreatePromptForm = {
  title: '',
  description: '',
  content: '',
  category: PromptCategory.general,
  isPublic: true,
  tags: [],
  imageUrls: [],
};

const CreatePrompt = () => {
  const [form, setForm] = useState<CreatePromptForm>(initialFormState);
  const [newTag, setNewTag] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const createPromptMutation = useMutation({
    mutationFn: async (promptData: CreatePromptForm) => {
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
        title: 'Error creating prompt',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    },
  });

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.content.trim()) newErrors.content = 'Content is required';
    if (!Object.values(PromptCategory).includes(form.category)) {
      newErrors.category = 'Please select a valid category';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        await createPromptMutation.mutateAsync(form);
      } catch (error) {
        // Error is handled by mutation error callback
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!form.tags.includes(newTag.trim())) {
        setForm((prev) => ({
          ...prev,
          tags: [...prev.tags, newTag.trim()],
        }));
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prevForm) => {
      const newForm = {
        ...prevForm,
        [name]: value,
      };
      return newForm;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    setIsUploading(true);
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axiosInstance.post('/uploads/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setForm(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, response.data.imageUrl],
      }));

      toast({
        title: 'Image uploaded successfully!',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Error uploading image',
        description: error.response?.data?.message || 'Please try again later.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setForm(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter(url => url !== imageUrl),
    }));
  };

  return (
    <>
      <SEO
        title="Create AI Prompt"
        description="Create and share your AI prompts with the RabbitR1 community. Add descriptions, tags, and categories to help others discover your prompts."
        openGraph={{
          title: "Create AI Prompt - RabbitR1 Prompts",
          description: "Share your AI expertise by creating and publishing prompts on RabbitR1 Prompts.",
          type: "website",
        }}
      />
      <Container maxW="container.md" py={8}>
        <Box
          as="form"
          onSubmit={handleSubmit}
          bg={bgColor}
          p={8}
          borderRadius="xl"
          boxShadow="xl"
          border="1px"
          borderColor={borderColor}
        >
          <Stack spacing={6}>
            <FormControl isRequired isInvalid={!!errors.title}>
              <FormLabel fontWeight="medium">Title</FormLabel>
              <Input
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder="Enter a title for your prompt"
                bg={useColorModeValue('white', 'gray.900')}
                borderColor={useColorModeValue('gray.300', 'gray.600')}
                _hover={{ borderColor: 'rabbit.400' }}
                _focus={{ borderColor: 'rabbit.500', boxShadow: 'none' }}
              />
              <FormErrorMessage>{errors.title}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.description}>
              <FormLabel fontWeight="medium">Description</FormLabel>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                placeholder="Write a brief description"
                bg={useColorModeValue('white', 'gray.900')}
                borderColor={useColorModeValue('gray.300', 'gray.600')}
                _hover={{ borderColor: 'rabbit.400' }}
                _focus={{ borderColor: 'rabbit.500', boxShadow: 'none' }}
                rows={3}
              />
              <FormErrorMessage>{errors.description}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.content}>
              <FormLabel fontWeight="medium">Content</FormLabel>
              <Textarea
                name="content"
                value={form.content}
                onChange={handleInputChange}
                placeholder="Enter your prompt content"
                bg={useColorModeValue('white', 'gray.900')}
                borderColor={useColorModeValue('gray.300', 'gray.600')}
                _hover={{ borderColor: 'rabbit.400' }}
                _focus={{ borderColor: 'rabbit.500', boxShadow: 'none' }}
                rows={6}
              />
              <FormErrorMessage>{errors.content}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.category}>
              <FormLabel fontWeight="medium">Category</FormLabel>
              <Select
                name="category"
                value={form.category}
                onChange={(e) => {
                  const value = e.target.value as PromptCategory;
                  setForm(prev => ({ ...prev, category: value }));
                }}
                bg={useColorModeValue('white', 'gray.900')}
                borderColor={useColorModeValue('gray.300', 'gray.600')}
                _hover={{ borderColor: 'rabbit.400' }}
                _focus={{ borderColor: 'rabbit.500', boxShadow: 'none' }}
              >
                {Object.values(PromptCategory).map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_DISPLAY_NAMES[value]}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.category}</FormErrorMessage>
            </FormControl>

            {form.category === PromptCategory['generative-ui'] && (
              <FormControl>
                <FormLabel fontWeight="medium">Upload Images</FormLabel>
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
                  <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                    {form.imageUrls.map((url, index) => (
                      <Box key={index} position="relative">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          borderRadius="md"
                          objectFit="cover"
                          w="100%"
                          h="150px"
                        />
                        <IconButton
                          aria-label="Remove image"
                          icon={<FiX />}
                          size="sm"
                          position="absolute"
                          top={2}
                          right={2}
                          onClick={() => handleRemoveImage(url)}
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </FormControl>
            )}

            <FormControl>
              <FormLabel fontWeight="medium">Tags</FormLabel>
              <Stack align="stretch" spacing={3}>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                  bg={useColorModeValue('white', 'gray.900')}
                  borderColor={useColorModeValue('gray.300', 'gray.600')}
                  _hover={{ borderColor: 'rabbit.400' }}
                  _focus={{ borderColor: 'rabbit.500', boxShadow: 'none' }}
                />
                <Flex wrap="wrap" gap={2}>
                  {form.tags.map((tag) => (
                    <Tag
                      key={tag}
                      size="md"
                      borderRadius="full"
                      variant="solid"
                      colorScheme="orange"
                    >
                      <TagLabel>{tag}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                    </Tag>
                  ))}
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  Press Enter to add a tag. Tags help others find your prompt.
                </Text>
              </Stack>
            </FormControl>

            <FormControl>
              <Stack>
                <Switch
                  id="isPublic"
                  isChecked={form.isPublic}
                  onChange={(e) => setForm((prev) => ({ ...prev, isPublic: e.target.checked }))}
                />
                <FormLabel htmlFor="isPublic" mb={0}>
                  Make this prompt public
                </FormLabel>
              </Stack>
              <Text fontSize="sm" color="gray.500" mt={1}>
                Public prompts can be discovered by other users
              </Text>
            </FormControl>

            <Button
              type="submit"
              colorScheme="orange"
              size="lg"
              width="full"
              isLoading={createPromptMutation.isPending}
            >
              Create Prompt
            </Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
};

export default CreatePrompt;
