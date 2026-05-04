import React, { useState, useEffect } from 'react';

export default function App() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const [ingredients, setIngredients] = useState([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [cuisine, setCuisine] = useState('Any');
  const [servings, setServings] = useState('2');
  const [dietary, setDietary] = useState([]);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [typedTitle, setTypedTitle] = useState('');

  const cuisines = [
    'Any', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 
    'Indian', 'American', 'French', 'Middle Eastern'
  ];

  const dietaryRestrictions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb'
  ];

  // Simulated streaming effect for recipe title
  useEffect(() => {
    if (recipe && recipe.title) {
      setTypedTitle('');
      let currentString = '';
      let index = 0;
      const intervalId = setInterval(() => {
        if (index < recipe.title.length) {
          currentString += recipe.title.charAt(index);
          setTypedTitle(currentString);
          index++;
        } else {
          clearInterval(intervalId);
        }
      }, 30);

      return () => clearInterval(intervalId);
    }
  }, [recipe]);

  const addIngredient = (e) => {
    if (e) e.preventDefault();
    const trimmed = currentIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setCurrentIngredient('');
    }
  };

  const removeIngredient = (ing) => {
    setIngredients(ingredients.filter((item) => item !== ing));
  };

  const loadSurpriseIngredients = () => {
    const surprises = [
      ['Salmon', 'Asparagus', 'Lemon', 'Butter', 'Garlic'],
      ['Chicken', 'Bell Peppers', 'Onions', 'Soy Sauce', 'Honey'],
      ['Pasta', 'Tomato Sauce', 'Parmesan', 'Garlic', 'Basil'],
      ['Beef Steak', 'Potatoes', 'Butter', 'Rosemary', 'Mushrooms'],
      ['Tofu', 'Broccoli', 'Sesame Oil', 'Soy Sauce', 'Ginger', 'Scallions'],
      ['Eggplant', 'Zucchini', 'Bell Peppers', 'Tomato Sauce', 'Olive Oil', 'Thyme']
    ];
    const randomIndex = Math.floor(Math.random() * surprises.length);
    setIngredients(surprises[randomIndex]);
  };

  const toggleDietary = (diet) => {
    if (dietary.includes(diet)) {
      setDietary(dietary.filter((d) => d !== diet));
    } else {
      setDietary([...dietary, diet]);
    }
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient first.');
      return;
    }
    if (!apiKey) {
      setError('Please provide a Gemini API key.');
      return;
    }

    setLoading(true);
    setError('');
    setRecipe(null);

    const prompt = `
      You are a creative executive chef. Generate a delicious, concise, and realistic recipe using ONLY these ingredients or complementary basic pantry items: ${ingredients.join(', ')}.

      Constraints:
      - Cuisine: ${cuisine}
      - Servings: ${servings}
      - Dietary: ${dietary.join(', ') || 'none'}

      Respond in valid JSON format matching this exact schema:
      {
        "title": "Recipe Name",
        "time": "e.g., 30 mins",
        "ingredients": ["e.g., 1 lb chicken breasts, diced", "e.g., 2 tbsp olive oil"],
        "steps": ["Step 1 description", "Step 2 description", "Step 3 description"],
        "nutrition": {
          "calories": "e.g., 450",
          "protein": "e.g., 32g",
          "carbs": "e.g., 12g",
          "fat": "e.g., 18g"
        }
      }
    `;

    try {
      let response;
      let success = false;
      let lastError = null;
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash-lite-preview',
        'gemini-3-flash-preview',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
      ];

      for (const model of modelsToTry) {
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          if (response.ok) {
            success = true;
            break;
          } else {
            const errData = await response.json().catch(() => ({}));
            lastError = errData?.error?.message || response.statusText;
          }
        } catch (err) {
          lastError = err.message;
        }
      }

      if (!success) {
        let msg = lastError || 'Could not connect to Gemini.';
        if (msg.toLowerCase().includes('leaked') || msg.toLowerCase().includes('quota')) {
          msg = 'Your Gemini API key has been reported as leaked or its free quota has been exceeded. Please generate a fresh API key from Google AI Studio and update it in your Netlify site settings.';
        }
        throw new Error(`API error: ${msg}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('No valid response received from Gemini.');
      }

      const parsedRecipe = JSON.parse(rawText);
      setRecipe(parsedRecipe);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating your recipe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Smart Chef AI</h1>
        <p className="subtitle">
          Unlock your pantry. Enter ingredients and let advanced AI create a custom luxury culinary experience.
        </p>
      </header>

      <main className="main-content">
        <section className="generator-panel">
          <div className="form-group">
            <label>
              <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                Add Ingredients <span className="hint">Press enter to add</span>
              </span>
              <button 
                type="button" 
                onClick={loadSurpriseIngredients} 
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.65rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  marginLeft: 'auto',
                  transition: 'all 0.2s ease'
                }}
              >
                🎲 Surprise Me
              </button>
            </label>
            <form onSubmit={addIngredient} className="ingredient-input-wrapper">
              <input
                type="text"
                placeholder="e.g. Chicken, Olive Oil, Garlic"
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
              />
              <button type="submit" className="btn-add">
                Add
              </button>
            </form>
            <div className="tags-container">
              {ingredients.map((ing) => (
                <span key={ing} className="tag">
                  {ing}
                  <button onClick={() => removeIngredient(ing)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="cuisine-servings-grid">
            <div className="form-group">
              <label>Cuisine Style</label>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                {cuisines.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Servings</label>
              <select value={servings} onChange={(e) => setServings(e.target.value)}>
                <option value="1">1 Person</option>
                <option value="2">2 People</option>
                <option value="4">4 People</option>
                <option value="6">6+ People</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Dietary Restrictions</label>
            <div className="dietary-options">
              {dietaryRestrictions.map((diet) => (
                <div
                  key={diet}
                  className={`diet-option ${dietary.includes(diet) ? 'selected' : ''}`}
                  onClick={() => toggleDietary(diet)}
                >
                  <span className="checkbox-visual"></span>
                  <span>{diet}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.25rem' }}>{error}</div>}

          <button
            className="btn-generate"
            onClick={generateRecipe}
            disabled={loading || ingredients.length === 0}
          >
            {loading ? (
              <>Creating recipe...</>
            ) : (
              <>
                <span>✦</span> Generate Culinary Plan
              </>
            )}
          </button>
        </section>

        <section className="response-panel">
          {!loading && !recipe && (
            <div className="empty-state">
              <div className="chef-icon">👨‍🍳</div>
              <h3>No Recipe Generated Yet</h3>
              <p>Add ingredients on the left and start creating delicious custom dishes!</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <div className="loading-text">Our AI Chef is curating your dish...</div>
            </div>
          )}

          {recipe && (
            <div className="recipe-content">
              <div className="recipe-header">
                <h2 className="recipe-title">{typedTitle}</h2>
                <div className="meta-stats">
                  <div className="stat-chip">
                    <span className="label">Prep/Cook Time:</span>
                    <span className="value">{recipe.time}</span>
                  </div>
                  <div className="stat-chip">
                    <span className="label">Style:</span>
                    <span className="value">{cuisine}</span>
                  </div>
                </div>
              </div>

              <div className="recipe-grid">
                <div className="ingredients-section">
                  <h4 className="section-title">🛒 Precise Ingredients</h4>
                  <div className="ingredient-list">
                    {recipe.ingredients &&
                      recipe.ingredients.map((ing, i) => (
                        <div className="ingredient-item" key={i}>
                          {ing}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="steps-section">
                  <h4 className="section-title">👨‍🍳 Step-by-Step Cooking</h4>
                  <div className="steps-list">
                    {recipe.steps &&
                      recipe.steps.map((step, i) => (
                        <div className="step-card" key={i}>
                          <div className="step-number">{i + 1}</div>
                          <div className="step-content">{step}</div>
                        </div>
                      ))}
                  </div>
                </div>

                {recipe.nutrition && (
                  <div className="nutrition-section">
                    <h4 className="section-title">📊 Nutritional Breakdown</h4>
                    <div className="nutrition-grid">
                      <div className="nutrition-card">
                        <span className="nutrition-val">{recipe.nutrition.calories || 'N/A'}</span>
                        <span className="nutrition-lbl">Calories</span>
                      </div>
                      <div className="nutrition-card">
                        <span className="nutrition-val">{recipe.nutrition.protein || 'N/A'}</span>
                        <span className="nutrition-lbl">Protein</span>
                      </div>
                      <div className="nutrition-card">
                        <span className="nutrition-val">{recipe.nutrition.carbs || 'N/A'}</span>
                        <span className="nutrition-lbl">Carbs</span>
                      </div>
                      <div className="nutrition-card">
                        <span className="nutrition-val">{recipe.nutrition.fat || 'N/A'}</span>
                        <span className="nutrition-lbl">Fat</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
