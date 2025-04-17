import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  useToast,
  useColorModeValue,
  Select,
  Tag,
  TagLabel,
  TagCloseButton,
  Flex,
  Switch,
  FormHelperText,
  Image,
  SimpleGrid,
  IconButton,
  Text,
  Heading,
} from '@chakra-ui/react';
import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { PromptCategory, CATEGORY_DISPLAY_NAMES } from '../types/prompt';
import { FiUpload, FiX } from 'react-icons/fi';

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
            fallback={
              <Box
                w="100%"
                h="150px"
                bg="gray.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.500">Loading image...</Text>
              </Box>
            }
            onError={(e) => {
              console.error('Failed to load image:', url);
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

const EditPrompt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PromptCategory>(PromptCategory.general);
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Fetch existing prompt data
  const { data: prompt, isLoading } = useQuery({
    queryKey: ['prompt', id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/prompts/${id}`);
      return response.data;
    },
  });

  // Update form fields when prompt data is loaded
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description);
      setContent(prompt.content);
      setCategory(prompt.category);
      setIsPublic(prompt.isPublic);
      setTags(prompt.tags || []);
      setImageUrls(prompt.imageUrls || []);
    }
  }, [prompt]);

  const updatePromptMutation = useMutation({
    mutationFn: async (data: any) => {
      await axiosInstance.patch(`/prompts/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Prompt updated successfully',
        status: 'success',
        duration: 3000,
      });
      navigate('/prompts');
    },
    onError: () => {
      toast({
        title: 'Error updating prompt',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      toast({
        title: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const promptData = {
      title,
      description,
      content,
      category,
      tags,
      imageUrls,
      isPublic,
    };

    try {
      await updatePromptMutation.mutateAsync(promptData);
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Error saving prompt',
        description: 'Please try again or contact support if the issue persists.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      if (!tags.includes(currentTag.trim())) {
        setTags([...tags, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', event.target.files[0]);

    try {
      const response = await axiosInstance.post('/prompts/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.url) {
        setImageUrls((prev) => [...prev, response.data.url]);
        toast({
          title: 'Image uploaded successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Failed to upload image',
        description: 'Please try again or contact support if the issue persists.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setImageUrls(prev => prev.filter(url => url !== imageUrl));
  };

  if (isLoading) {
    return <Box>Loading...</Box>;
  }

  return (
    <Container maxW="container.md" py={20}>
      <Box
        bg={bgColor}
        p={8}
        borderRadius="xl"
        boxShadow="xl"
        border="1px"
        borderColor={borderColor}
      >
        <Stack spacing={6}>
          <Stack spacing={2}>
            <Heading size="xl">Edit Prompt</Heading>
            <Text color="gray.500">
              Update your R1 prompt
            </Text>
          </Stack>

          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your prompt a clear, descriptive title"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PromptCategory)}
                >
                  {Object.values(PromptCategory).map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_DISPLAY_NAMES[value as PromptCategory]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {category === PromptCategory['generative-ui'] && (
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
                  {imageUrls.length > 0 && (
                    <ImagePreview imageUrls={imageUrls} onRemove={handleRemoveImage} />
                  )}
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Type a tag and press Enter"
                />
                <Flex wrap="wrap" gap={2} mt={2}>
                  {tags.map((tag) => (
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
                <FormHelperText>
                  Add tags to help others find your prompt (press Enter after each tag)
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a brief description of what your prompt does"
                  rows={3}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Prompt Content</FormLabel>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your prompt here..."
                  rows={6}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="is-public" mb="0">
                  Make this prompt public?
                </FormLabel>
                <Switch
                  id="is-public"
                  isChecked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <FormHelperText ml={2}>
                  {isPublic
                    ? 'This prompt will be visible to everyone'
                    : 'This prompt will only be visible to you'}
                </FormHelperText>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                isLoading={updatePromptMutation.isPending}
              >
                Update Prompt
              </Button>
            </Stack>
          </form>
        </Stack>
      </Box>
    </Container>
  );
};

export default EditPrompt;
