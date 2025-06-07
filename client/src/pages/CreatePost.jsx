import { Alert, Button, FileInput, Select, TextInput } from 'flowbite-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useState, useEffect, useCallback } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

// Validasi tipe file
const validImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CreatePost() {
  const [file, setFile] = useState(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'uncategorized',
    image: null
  });
  const [publishError, setPublishError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  // Fungsi untuk memastikan pengguna terautentikasi
  const ensureAuthenticated = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('You need to login first');
      }
      return session;
    } catch (error) {
      console.error('Authentication error:', error);
      setImageUploadError('Authentication required. Please login.');
      throw error;
    }
  }, []);

  // Fungsi untuk memastikan bucket ada
  const ensureBucketExists = useCallback(async () => {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError && !listError.message.includes('Bucket not found')) {
        throw listError;
      }
      
      const bucketExists = buckets?.some(b => b.name === 'post-images');
      
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket('post-images', {
          public: false,
          allowedMimeTypes: validImageTypes,
          fileSizeLimit: MAX_FILE_SIZE
        });
        if (createError) throw createError;
      }
      return true;
    } catch (error) {
      console.error('Bucket setup error:', error);
      setImageUploadError('Failed to setup storage. Please try again.');
      throw error;
    }
  }, []);

  // Proses pending uploads saat online
  const processPendingUploads = useCallback(async () => {
    if (!isOnline || pendingUploads.length === 0) return;

    try {
      await ensureAuthenticated();
      await ensureBucketExists();
      
      const results = await Promise.allSettled(
        pendingUploads.map(async ({ file, fileName }) => {
          const { error } = await supabase.storage
            .from('post-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(fileName);

          return { fileName, publicUrl };
        })
      );

      const successfulUploads = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedUploads = results
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({
          ...pendingUploads[index],
          error: result.reason
        }));

      if (successfulUploads.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          image: successfulUploads[0].publicUrl 
        }));
      }

      setPendingUploads(failedUploads);
      localStorage.setItem('pendingUploads', JSON.stringify(failedUploads));
    } catch (error) {
      console.error('Pending uploads error:', error);
      setImageUploadError('Failed to process pending uploads');
    } finally {
      setImageUploadProgress(null);
    }
  }, [isOnline, pendingUploads, ensureAuthenticated, ensureBucketExists]);

  // Handle upload gambar
  const handleUploadImage = useCallback(async () => {
    try {
      if (!file) {
        setImageUploadError('Please select an image first');
        return;
      }

      if (!validImageTypes.includes(file.type)) {
        setImageUploadError('Unsupported file format. Use PNG, JPEG, GIF, or WEBP.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setImageUploadError('File size too large. Max 5MB.');
        return;
      }

      setImageUploadError(null);
      setImageUploadProgress(10);

      await ensureAuthenticated();
      await ensureBucketExists();
      
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;

      if (!isOnline) {
        const newPendingUploads = [...pendingUploads, { file, fileName }];
        setPendingUploads(newPendingUploads);
        localStorage.setItem('pendingUploads', JSON.stringify(newPendingUploads));
        setImageUploadError('You are offline. Image will be uploaded when connection is restored.');
        setImageUploadProgress(null);
        return;
      }

      setImageUploadProgress(30);
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) throw error;

      setImageUploadProgress(70);
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image: publicUrl }));
      setImageUploadProgress(100);
      
      setTimeout(() => setImageUploadProgress(null), 500);
    } catch (error) {
      console.error('Upload error:', error);
      setImageUploadError(error.message || 'Failed to upload image');
      setImageUploadProgress(null);
      
      if (!navigator.onLine) {
        const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
        const newPendingUploads = [...pendingUploads, { file, fileName }];
        setPendingUploads(newPendingUploads);
        localStorage.setItem('pendingUploads', JSON.stringify(newPendingUploads));
      }
    }
  }, [file, isOnline, pendingUploads, ensureAuthenticated, ensureBucketExists]);

  // Handle submit form
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!formData.title || !formData.content) {
        throw new Error('Title and content are required');
      }

      const session = await ensureAuthenticated();

      if (!isOnline) {
        localStorage.setItem('postDraft', JSON.stringify(formData));
        setDraftSaved(true);
        
        if (file && !formData.image) {
          const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
          const newPendingUploads = [...pendingUploads, { file, fileName }];
          setPendingUploads(newPendingUploads);
          localStorage.setItem('pendingUploads', JSON.stringify(newPendingUploads));
        }
        return;
      }

      if (pendingUploads.length > 0 && !formData.image) {
        await processPendingUploads();
        throw new Error('Please try submitting again after upload completes');
      }

      const { error } = await supabase
        .from('posts')
        .insert([{
          title: formData.title,
          content: formData.content,
          image: formData.image,
          category: formData.category,
          author_id: session.user.id
        }]);

      if (error) throw error;

      localStorage.removeItem('postDraft');
      localStorage.removeItem('pendingUploads');
      setDraftSaved(false);
      setPendingUploads([]);
      navigate('/');
    } catch (error) {
      console.error('Submission error:', error);
      setPublishError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isOnline, file, pendingUploads, processPendingUploads, ensureAuthenticated, navigate]);

  // Load data saat mount dan handle online/offline
  useEffect(() => {
    const loadData = () => {
      try {
        const savedDraft = localStorage.getItem('postDraft');
        const savedUploads = localStorage.getItem('pendingUploads');
        
        if (savedDraft) setFormData(JSON.parse(savedDraft));
        if (savedUploads) setPendingUploads(JSON.parse(savedUploads));
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (pendingUploads.length > 0) {
        processPendingUploads();
      }
    };

    const handleOffline = () => setIsOnline(false);

    loadData();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processPendingUploads, pendingUploads.length]);

  return (
    <div className='p-3 max-w-3xl mx-auto min-h-screen'>
      <h1 className='text-center text-3xl my-7 font-semibold'>Create Post</h1>
      
      {!isOnline && (
        <Alert color="warning" className="mb-4">
          You are offline! Changes will be saved locally.
        </Alert>
      )}
      
      {draftSaved && (
        <Alert color="success" className="mb-4">
          Draft saved locally. Will be published when online.
        </Alert>
      )}
      
      {pendingUploads.length > 0 && (
        <Alert color="info" className="mb-4">
          {pendingUploads.length} pending uploads. {isOnline ? 'Processing...' : 'Waiting for connection...'}
        </Alert>
      )}

      <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4 sm:flex-row justify-between'>
          <TextInput
            type='text'
            placeholder='Title'
            required
            id='title'
            className='flex-1'
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
          <Select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          >
            <option value='uncategorized'>Select category</option>
            <option value='javascript'>JavaScript</option>
            <option value='reactjs'>React.js</option>
            <option value='nextjs'>Next.js</option>
          </Select>
        </div>

        <div className='flex gap-4 items-center justify-between border-4 border-teal-500 border-dotted p-3 rounded-lg'>
          <FileInput
            type='file'
            accept={validImageTypes.join(', ')}
            onChange={(e) => {
              setFile(e.target.files[0]);
              setImageUploadError(null);
            }}
            disabled={imageUploadProgress}
            className="w-full"
          />
          <Button
            type='button'
            gradientDuoTone='purpleToBlue'
            size='sm'
            outline
            onClick={handleUploadImage}
            disabled={imageUploadProgress || !file}
            className="min-w-[120px]"
          >
            {imageUploadProgress ? (
              <div className='w-6 h-6'>
                <CircularProgressbar
                  value={imageUploadProgress}
                  text={`${imageUploadProgress}%`}
                  styles={buildStyles({
                    textSize: '34px',
                    pathColor: '#3b82f6',
                    textColor: '#3b82f6',
                  })}
                />
              </div>
            ) : 'Upload Image'}
          </Button>
        </div>

        {imageUploadError && (
          <Alert color='failure' className="mb-4" onDismiss={() => setImageUploadError(null)}>
            <div className="flex flex-col">
              <span>{imageUploadError}</span>
              <Button 
                color="light" 
                size="xs" 
                className="mt-2 self-end"
                onClick={handleUploadImage}
              >
                Try Again
              </Button>
            </div>
          </Alert>
        )}

        {formData.image && (
          <div className="relative group">
            <img
              src={formData.image}
              alt='Preview'
              className='w-full h-72 object-cover rounded-lg shadow'
            />
            <Button 
              color="failure" 
              size="xs"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setFormData(prev => ({ ...prev, image: null }))}
            >
              Remove
            </Button>
          </div>
        )}

        <div className="mb-8">
          <ReactQuill
            theme='snow'
            placeholder='Write your post content here...'
            className='h-72'
            required
            value={formData.content}
            onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
            modules={{
              toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
              ]
            }}
          />
        </div>

        <Button 
          type='submit' 
          gradientDuoTone='purpleToPink'
          disabled={(!isOnline && pendingUploads.length > 0) || imageUploadProgress || isSubmitting}
          className="mt-4"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {!isOnline ? 'Saving Draft...' : 'Publishing...'}
            </span>
          ) : !isOnline ? 'Save Draft' : 'Publish'}
        </Button>
        
        {publishError && (
          <Alert className='mt-5' color='failure' onDismiss={() => setPublishError(null)}>
            {publishError}
          </Alert>
        )}
      </form>
    </div>
  );
}