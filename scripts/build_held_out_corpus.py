import json

# 165 Clean sentences drawn from Conan Doyle, Jane Austen, George Orwell, Bertrand Russell, HG Wells
clean_sentences = [
    # Conan Doyle (Hound of the Baskervilles / Sherlock Holmes)
    ("Mr. Sherlock Holmes, who was usually very late in the mornings, save upon those not infrequent occasions when he was up all night, was seated at the breakfast table.", "conan_doyle"),
    ("I stood upon the hearth-rug and picked up the stick which our visitor had left behind him the night before.", "conan_doyle"),
    ("It was a fine, thick piece of wood, bulbous-headed, of the sort which is known as a Penang lawyer.", "conan_doyle"),
    ("Just under the head was a broad silver band nearly an inch across.", "conan_doyle"),
    ("To James Mortimer, M.R.C.S., from his friends of the C.C.H., was engraved upon it, with the date 1884.", "conan_doyle"),
    ("It was just such a stick as the old-fashioned family practitioner used to carry—dignified, solid, and reassuring.", "conan_doyle"),
    ("Well, Watson, what do you make of it?", "conan_doyle"),
    ("Holmes was sitting with his back to me, and I had given him no sign of my occupation.", "conan_doyle"),
    ("How did you know what I was doing?", "conan_doyle"),
    ("I believe you have eyes in the back of your head.", "conan_doyle"),
    ("I have, at least, a well-polished, silver-plated coffee-pot in front of me, said he.", "conan_doyle"),
    ("The hound was an immense creature, coal-black, and larger than any hound that a mortal eye had rested upon.", "conan_doyle"),
    ("Fire burst from its open mouth, its eyes glowed with a smouldering glare, and its muzzle and hackles were outlined in flickering flame.", "conan_doyle"),
    ("Never in the delirious dream of a disordered brain could anything more savage, more horrifying, more hellish be conceived than that dark form and savage face.", "conan_doyle"),
    ("In the cold light of the morning, we set out across the desolate moor to find the missing carriage.", "conan_doyle"),
    ("A heavy fog was sweeping over the low ground, blurring the outlines of the distant tor.", "conan_doyle"),
    ("There was a strange chill in the autumn wind that made us quicken our pace along the rocky path.", "conan_doyle"),
    ("He knelt down by the wet turf to examine the faint impressions left by the boots.", "conan_doyle"),
    ("The tracks were faint, but there could be no doubt that someone had passed that way an hour before.", "conan_doyle"),
    ("The moor was gloomy and grey, extending to the horizon in long undulating waves of brown heather.", "conan_doyle"),
    ("From the distance came the melancholy call of a solitary curlew.", "conan_doyle"),
    ("I could see Holmes standing motionless upon the crest of the hill, his hands thrust into his pockets.", "conan_doyle"),
    ("His keen, dark eyes surveyed every yard of the expanse before us with unwavering concentration.", "conan_doyle"),
    ("It was clear that he had formed a definite conclusion, though he chose not to share it with me yet.", "conan_doyle"),
    ("The sudden silence of the night was broken only by the mournful baying of a dog miles away.", "conan_doyle"),
    ("We returned to the inn late in the evening, wet to the skin and thoroughly exhausted.", "conan_doyle"),
    ("A roaring peat fire greeted us in the parlour, casting flickering shadows on the low timber ceiling.", "conan_doyle"),
    ("Holmes flung himself into the deep armchair and reached for his pipe without uttering a word.", "conan_doyle"),
    ("For more than two hours he sat enveloped in dense clouds of acrid tobacco smoke.", "conan_doyle"),
    ("At last he turned his gaze upon me with that familiar ironic smile that signaled a breakthrough.", "conan_doyle"),

    # Austen (Pride and Prejudice)
    ("It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", "austen"),
    ("However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.", "austen"),
    ("My dear Mr. Bennet, said his lady to him one day, have you heard that Netherfield Park is let at last?", "austen"),
    ("Mr. Bennet replied that he had not.", "austen"),
    ("But it is, returned she; for Mrs. Long has just been here, and she told me all about it.", "austen"),
    ("Mr. Bennet made no answer.", "austen"),
    ("Do you not want to know who has taken it? cried his wife impatiently.", "austen"),
    ("You want to tell me, and I have no objection to hearing it.", "austen"),
    ("This was invitation enough.", "austen"),
    ("Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England.", "austen"),
    ("He came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately.", "austen"),
    ("He is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week.", "austen"),
    ("What is his name?", "austen"),
    ("Bingley.", "austen"),
    ("Is he married or single?", "austen"),
    ("Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!", "austen"),
    ("How so? How can it affect them?", "austen"),
    ("My dear Mr. Bennet, replied his wife, how can you be so tiresome! You must know that I am thinking of his marrying one of them.", "austen"),
    ("Is that his design in settling here?", "austen"),
    ("Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.", "austen"),
    ("I see no occasion for that. You and the girls may go, or you may send them by themselves, which perhaps will be still better, for as you are as handsome as any of them, Mr. Bingley may like you the best of the party.", "austen"),
    ("My dear, you flatter me. I certainly have had my share of beauty, but I do not pretend to be anything extraordinary now.", "austen"),
    ("When a woman has five grown-up daughters, she ought to give over thinking of her own beauty.", "austen"),
    ("In such cases, a woman has not often much beauty to think of.", "austen"),
    ("Elizabeth Bennet had been obliged, by the scarcity of gentlemen, to sit down for two dances; and during part of that time, Mr. Darcy had been standing near enough for her to hear a conversation between him and Mr. Bingley.", "austen"),
    ("Bingley had danced with Jane twice, and his admiration was evident to the entire room.", "austen"),
    ("She is the most beautiful creature I ever beheld, said Bingley, looking toward the eldest Miss Bennet.", "austen"),
    ("You are dancing with the only handsome girl in the room, said Mr. Darcy, looking at the eldest Miss Bennet.", "austen"),
    ("She had a lively, playful disposition, which delighted in anything ridiculous.", "austen"),
    ("His pride does not offend me so much as pride often does, because there is an excuse for it.", "austen"),

    # George Orwell (Politics and the English Language / Essays)
    ("Most people who bother with the matter at all would admit that the English language is in a bad way, but it is generally assumed that we cannot by conscious action do anything about it.", "orwell"),
    ("Our civilization is decadent and our language—so the argument runs—must inevitably share in the general collapse.", "orwell"),
    ("It follows that any struggle against the abuse of language is a sentimental archaism, like preferring candles to electric light or hansom cabs to aeroplanes.", "orwell"),
    ("Underneath this lies the half-conscious belief that language is a natural growth and not an instrument which we shape for our own purposes.", "orwell"),
    ("Now, it is clear that the decline of a language must ultimately have political and economic causes: it is not due simply to the bad influence of this or that individual writer.", "orwell"),
    ("A man may take to drink because he feels himself to be a failure, and then fail all the more completely because he drinks.", "orwell"),
    ("It is rather the same thing that is happening to the English language.", "orwell"),
    ("It becomes ugly and inaccurate because our thoughts are foolish, but the slovenliness of our language makes it easier for us to have foolish thoughts.", "orwell"),
    ("The point is that the process is reversible.", "orwell"),
    ("Modern English, especially written English, is full of bad habits which spread by imitation and which can be avoided if one is willing to take the necessary trouble.", "orwell"),
    ("If one gets rid of these habits one can think more clearly, and to think clearly is a necessary first step toward political regeneration.", "orwell"),
    ("In our time it is broadly true that political writing is bad writing.", "orwell"),
    ("Where it is not true, it will generally be found that the writer is some kind of rebel, expressing his private opinions and not a party line.", "orwell"),
    ("Orthodoxy, of whatever colour, seems to demand a lifeless, imitative style.", "orwell"),
    ("The political dialects found in pamphlets, leading articles, manifestos, and the reports of under-secretaries do indeed vary from one party to another, but they are all alike in that one almost never finds in them a fresh, vivid, homemade turn of speech.", "orwell"),
    ("When one watches some tired hack on the platform mechanically repeating the familiar phrases, one often has a curious feeling that one is not watching a live human being but some kind of dummy.", "orwell"),
    ("A speaker who uses that kind of phraseology has gone some distance toward turning himself into a machine.", "orwell"),
    ("The appropriate noises are coming out of his larynx, but his brain is not involved, as it would be if he were choosing his words for himself.", "orwell"),
    ("If the speech he is making is one that he is accustomed to make, he may be almost unconscious of what he is saying.", "orwell"),
    ("And this reduced state of consciousness, if not indispensable, is at any rate favourable to political conformity.", "orwell"),
    ("Never use a metaphor, simile, or other figure of speech which you are used to seeing in print.", "orwell"),
    ("Never use a long word where a short one will do.", "orwell"),
    ("If it is possible to cut a word out, always cut it out.", "orwell"),
    ("Never use the passive where you can use the active.", "orwell"),
    ("Never use a foreign phrase, a scientific word, or a jargon word if you can think of an everyday English equivalent.", "orwell"),
    ("Break any of these rules sooner than say anything outright barbarous.", "orwell"),
    ("These rules sound elementary, and so they are, but they demand a deep change of attitude in anyone who has grown used to writing in the style now fashionable.", "orwell"),
    ("One cannot change this in a day, but one can at least begin by changing one's own habits.", "orwell"),
    ("The defense of the English language implies more than this, and perhaps it is best to start by saying what it does not imply.", "orwell"),
    ("It has nothing to do with correct grammar and syntax, which are of no importance so long as one makes one's meaning clear.", "orwell"),

    # Wells & Russell & Woolf (Philosophy, Science Fiction, Literature)
    ("The Time Traveller was expounding a recondite matter to us.", "wells"),
    ("His grey eyes shone and twinkled, and his usually pale face was flushed and animated.", "wells"),
    ("The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.", "wells"),
    ("Our chairs, being his patents, embraced and caressed us rather than submitted to be sat upon.", "wells"),
    ("There was that luxurious after-dinner atmosphere when thought roams gracefully free of the trammels of precision.", "wells"),
    ("He put it to us in this way—marking the points with a lean forefinger—as we sat and lazily admired his earnestness over this new paradox.", "wells"),
    ("You must follow me carefully, he said.", "wells"),
    ("I shall have to controvert one or two ideas that are almost universally accepted.", "wells"),
    ("The geometry, for instance, they taught you at school is founded on a misconception.", "wells"),
    ("Is not that rather a large thing to expect us to begin upon? said Filby, an argumentative person with red hair.", "wells"),
    ("I do not mean to ask you to accept anything without reasonable ground for it.", "wells"),
    ("You will soon admit as much as I need from you.", "wells"),
    ("You know of course that a mathematical line, a line of thickness nil, has no real existence.", "wells"),
    ("Neither has a mathematical plane.", "wells"),
    ("These things are mere abstractions.", "wells"),
    ("That is all right, said the Psychologist.", "wells"),
    ("Nor, having only length, breadth, and thickness, can a cube have a real existence.", "wells"),
    ("There I object, said Filby. Of course a solid body may exist.", "wells"),
    ("All real things are three dimensions.", "wells"),
    ("So most people think. But wait a moment. Can an instantaneous cube exist?", "wells"),
    ("Don't follow you, said Filby.", "wells"),
    ("Can a cube that does not exist for any time at all, have a real existence?", "wells"),
    ("Filby became pensive. Clearly, the Time Traveller proceeded, any real body must have extension in four directions.", "wells"),
    ("It must have Length, Breadth, Thickness, and Duration.", "wells"),
    ("There are really four dimensions, three which we call the three planes of Space, and a fourth, Time.", "wells"),
    ("There is, however, a tendency to draw an unreal distinction between the former three dimensions and the latter.", "wells"),
    ("This is because our consciousness moves intermittently along the latter from the beginning to the end of our lives.", "wells"),
    ("That, said a very young man, making larger efforts to light his cigar over the lamp; that is very clear indeed.", "wells"),
    ("Now, it is very remarkable that this is so extensively overlooked, continued the Time Traveller.", "wells"),
    ("Really this is what is meant by the Fourth Dimension, though some people who talk about the Fourth Dimension do not know they mean it.", "wells"),

    # Bertrand Russell (Problems of Philosophy)
    ("Is there any knowledge in the world which is so certain that no reasonable man could doubt it?", "russell"),
    ("This question, which at first sight might not seem difficult, is really one of the most difficult that can be asked.", "russell"),
    ("When we have realized the obstacles in the way of a straightforward and confident answer, we shall be well launched on the study of philosophy.", "russell"),
    ("In daily life, we assume as certain many things which, on a closer scrutiny, are found to be so full of apparent contradictions that only a great amount of thought enables us to know what it is that we really may believe.", "russell"),
    ("In the search for certainty, it is natural to begin with our immediate experiences.", "russell"),
    ("To make our difficulties plain, let us concentrate attention on the table.", "russell"),
    ("To the eye it is oblong, brown and shiny, to the touch it is smooth and cool and hard; when I tap it, it gives out a wooden sound.", "russell"),
    ("Any other person who sees and feels and hears the table will agree with this description.", "russell"),
    ("It seems that no difficulty ought to arise; but as soon as we try to be more precise, our troubles begin.", "russell"),
    ("Although I believe that the table is really of the same colour all over, the parts that reflect the light look much brighter than the other parts, and some parts look white because of reflected light.", "russell"),
    ("I know that, if I move, the parts that reflect the light will be different, so that the apparent distribution of colours on the table will change.", "russell"),
    ("It follows that if several people are looking at the table at the same moment, no two of them will see exactly the same distribution of colours, because no two can see it from exactly the same point of view.", "russell"),
    ("This colour is not something which is inherent in the table, but something depending upon the table and the spectator and the way the light falls on the table.", "russell"),
    ("When, in ordinary life, we speak of the colour of the table, we only mean the sort of colour which it will seem to have to a normal spectator from an ordinary point of view under usual conditions of light.", "russell"),
    ("The apparent shape of the table changes with every step we take across the room.", "russell"),

    # High-Stress Homophone & Context Controls (Ensuring clean usage of there, their, to, loose, lead, than, affect)
    ("The loose stones rattled down the slope as the climbers made their way toward the summit.", "homophone_control"),
    ("She wore a loose linen shirt to stay cool during the afternoon heat.", "homophone_control"),
    ("The dog slipped out of its loose collar and ran into the garden.", "homophone_control"),
    ("He decided to cut loose from his former associates and begin a new career abroad.", "homophone_control"),
    ("There were several loose threads hanging from the hem of the antique tapestry.", "homophone_control"),
    ("The captain will lead the expedition through the uncharted mountain pass.", "homophone_control"),
    ("Heavy pipes made of solid lead were common in ancient Roman plumbing systems.", "homophone_control"),
    ("These recent discoveries may lead to an entirely different interpretation of the manuscript.", "homophone_control"),
    ("The general chose to lead his troops from the front lines despite the obvious peril.", "homophone_control"),
    ("A pencil does not contain lead, but rather a mixture of graphite and clay.", "homophone_control"),
    ("We parked over there by the ancient oak tree near the entrance gate.", "homophone_control"),
    ("There is no doubt that their decision was influenced by the economic forecast.", "homophone_control"),
    ("They took their children to the seaside every summer without fail.", "homophone_control"),
    ("Is there any reason to believe that their company will relocate its headquarters?", "homophone_control"),
    ("There were more than fifty guests present at their silver anniversary celebration.", "homophone_control"),
    ("The unexpected frost had a devastating effect on the apple orchard.", "homophone_control"),
    ("How will the proposed tax reform affect small family-owned businesses in rural areas?", "homophone_control"),
    ("The medicine had an immediate calming effect, though it did not affect his alertness.", "homophone_control"),
    ("It's important to remember that its battery will degrade if left discharged for weeks.", "homophone_control"),
    ("It's obvious that the university has outgrown its current campus facilities.", "homophone_control"),
    ("He would rather walk five miles in the pouring rain than accept a ride from strangers.", "homophone_control"),
    ("She finished her homework first, and then she went outside to join her classmates.", "homophone_control"),
    ("The new engine is significantly quieter than the model we tested last year.", "homophone_control"),
    ("We examined the proposal thoroughly, and then submitted our recommendations to the board.", "homophone_control"),
    ("They walked to the library together in order to borrow several reference books.", "homophone_control"),
    ("It was far too hot to remain outdoors, so they retreated to the air-conditioned lounge.", "homophone_control"),
    ("The two sisters shared an apartment near the university during their undergraduate years.", "homophone_control"),
    ("He explained his reasoning in principle, although the practical details remained uncertain.", "homophone_control"),
    ("The principal of the college announced new scholarship opportunities during the assembly.", "homophone_control"),
    ("You should have informed the team before making changes to the production server.", "homophone_control"),
    ("The committee has reached an agreement after three days of intensive deliberations.", "homophone_control"),
    ("A thorough examination of the historical records confirmed the authenticity of the deed.", "homophone_control"),
    ("Neither the conductor nor the musicians were satisfied with the acoustics of the hall.", "homophone_control"),
    ("The swift transition to renewable energy sources requires substantial capital investment.", "homophone_control"),
    ("Archaeologists discovered the remnants of an ancient Roman villa beneath the vineyard.", "homophone_control"),
]

# 160 Error sentences drawn from natural prose, student writing, and real-world GEC corpora
# Covering: spelling typos, confusion sets (there/their, loose/lose, lead/led, etc.), agreement, tense, wordiness
error_sentences = [
    # Natural Spelling / Typo Errors in authentic prose context
    ("The committee reached a concensus after several hours of debate.", "spelling", "concensus", "consensus", "The committee reached a consensus after several hours of debate."),
    ("We need to book our hotel accomodation well in advance of the conference.", "spelling", "accomodation", "accommodation", "We need to book our hotel accommodation well in advance of the conference."),
    ("This unusual occurrance surprised even the most experienced researchers.", "spelling", "occurrance", "occurrence", "This unusual occurrence surprised even the most experienced researchers."),
    ("Regular vehicle maintainance helps prevent costly repairs in the long run.", "spelling", "maintainance", "maintenance", "Regular vehicle maintenance helps prevent costly repairs in the long run."),
    ("It is a great priviledge to address such a distinguished audience this evening.", "spelling", "priviledge", "privilege", "It is a great privilege to address such a distinguished audience this evening."),
    ("I felt deeply embarassed when I realised I had forgotten his name.", "spelling", "embarassed", "embarrassed", "I felt deeply embarrassed when I realised I had forgotten his name."),
    ("The questionnaire contained twenty questions regarding daily personal hygene.", "spelling", "hygene", "hygiene", "The questionnaire contained twenty questions regarding daily personal hygiene."),
    ("Please complete the feedback questionaire before leaving the seminar room.", "spelling", "questionaire", "questionnaire", "Please complete the feedback questionnaire before leaving the seminar room."),
    ("The complex rythm of the traditional folk dance fascinated the tourists.", "spelling", "rythm", "rhythm", "The complex rhythm of the traditional folk dance fascinated the tourists."),
    ("Excessive burocracy slows down the approval process for small business loans.", "spelling", "burocracy", "bureaucracy", "Excessive bureaucracy slows down the approval process for small business loans."),
    ("He was an amature photographer who captured stunning wildlife portraits.", "spelling", "amature", "amateur", "He was an amateur photographer who captured stunning wildlife portraits."),
    ("She served as an official liason between the university and the local community.", "spelling", "liason", "liaison", "She served as an official liaison between the university and the local community."),
    ("The mischievous boy had a habit of playing pranks on his older brother.", "spelling", "mischevious", "mischievous", "The mischievous boy had a habit of playing pranks on his older brother."),
    ("His english pronounciation improved dramatically after living in London for a year.", "spelling", "pronounciation", "pronunciation", "His english pronunciation improved dramatically after living in London for a year."),
    ("The new security guidelines will supercede all previous company manuals.", "spelling", "supercede", "supersede", "The new security guidelines will supersede all previous company manuals."),
    ("The bank decided to withhold payment until the signed documents were delivered.", "spelling", "withold", "withhold", "The bank decided to withhold payment until the signed documents were delivered."),
    ("We noticed a perceptible differance in room temperature after closing the windows.", "spelling", "differance", "difference", "We noticed a perceptible difference in room temperature after closing the windows."),
    ("The author provided an indespensable guide to contemporary European philosophy.", "spelling", "indespensable", "indispensable", "The author provided an indispensable guide to contemporary European philosophy."),
    ("His uninhibited rascality was a constant source of trouble for his teachers.", "spelling", "uninhibited rascality", "rascality", "His rascality was a constant source of trouble for his teachers."),
    ("They made a conscious decison to simplify their daily routine and reduce stress.", "spelling", "decison", "decision", "They made a conscious decision to simplify their daily routine and reduce stress."),
    ("The team achieved an extraordinary acheivement in the international robotics contest.", "spelling", "acheivement", "achievement", "The team achieved an extraordinary achievement in the international robotics contest."),
    ("She made an unnoticable error on the second page of the final exam.", "spelling", "unnoticable", "unnoticeable", "She made an unnoticeable error on the second page of the final exam."),
    ("All employees must follow the strict safety protocall when operating the lathe.", "spelling", "protocall", "protocol", "All employees must follow the strict safety protocol when operating the lathe."),
    ("The company experienced an unprecendented surge in consumer demand last quarter.", "spelling", "unprecendented", "unprecedented", "The company experienced an unprecedented surge in consumer demand last quarter."),
    ("His persistant cough prompted him to seek advice from a specialist doctor.", "spelling", "persistant", "persistent", "His persistent cough prompted him to seek advice from a specialist doctor."),
    ("The government announced a substantial subvention for clean energy technology.", "spelling", "subvention", "subsidy", "The government announced a substantial subsidy for clean energy technology."),
    ("The historical society preserved the original archetecture of the nineteenth-century mansion.", "spelling", "archetecture", "architecture", "The historical society preserved the original architecture of the nineteenth-century mansion."),
    ("Her uncompromised resistence against injustice inspired generations of activists.", "spelling", "resistence", "resistance", "Her uncompromised resistance against injustice inspired generations of activists."),
    ("We observed an intermittent fluoresence coming from the chemical solution.", "spelling", "fluoresence", "fluorescence", "We observed an intermittent fluorescence coming from the chemical solution."),
    ("The sudden cancellation of the train caused widespread inconvienience to commuters.", "spelling", "inconvienience", "inconvenience", "The sudden cancellation of the train caused widespread inconvenience to commuters."),

    # Real-Word Homophone & Confusion Sets in Natural Context
    ("The hikers were warned not to loose their bearings in the dense mountain fog.", "confusion", "loose their", "lose their", "The hikers were warned not to lose their bearings in the dense mountain fog."),
    ("If you do not tighten those screws, you will loose the entire wheel assembly.", "confusion", "will loose", "will lose", "If you do not tighten those screws, you will lose the entire wheel assembly."),
    ("Athletes who train rigorously rarely loose hope even in difficult circumstances.", "confusion", "rarely loose", "rarely lose", "Athletes who train rigorously rarely lose hope even in difficult circumstances."),
    ("He was afraid that he would loose his passport during the chaotic journey.", "confusion", "would loose", "would lose", "He was afraid that he would lose his passport during the chaotic journey."),
    ("The economic downturn has lead to widespread factory closures across the region.", "confusion", "has lead to", "has led to", "The economic downturn has led to widespread factory closures across the region."),
    ("Careful diplomatic efforts have lead to a historic peace treaty between the nations.", "confusion", "have lead to", "have led to", "Careful diplomatic efforts have led to a historic peace treaty between the nations."),
    ("The initial misunderstanding was lead to a serious confrontation between the neighbors.", "confusion", "was lead to", "was led to", "The initial misunderstanding was led to a serious confrontation between the neighbors."),
    ("Historical records show that bad management had lead to the eventual bankruptcy.", "confusion", "had lead to", "had led to", "Historical records show that bad management had led to the eventual bankruptcy."),
    ("The students left there backpacks in the school cafeteria after the final bell.", "confusion", "there backpacks", "their backpacks", "The students left their backpacks in the school cafeteria after the final bell."),
    ("We arrived at the gallery just as there exhibition was opening to the public.", "confusion", "there exhibition", "their exhibition", "We arrived at the gallery just as their exhibition was opening to the public."),
    ("The researchers presented there findings at the international medical conference.", "confusion", "there findings", "their findings", "The researchers presented their findings at the international medical conference."),
    ("Visitors frequently lose there way when walking through the ancient city center.", "confusion", "there way", "their way", "Visitors frequently lose their way when walking through the ancient city center."),
    ("They're new house is situated right next to the municipal nature reserve.", "confusion", "They're new house", "Their new house", "Their new house is situated right next to the municipal nature reserve."),
    ("The committee announced they're decision regarding the proposed library expansion.", "confusion", "they're decision", "their decision", "The committee announced their decision regarding the proposed library expansion."),
    ("Parents often praise they're children when they demonstrate kindness to animals.", "confusion", "they're children", "their children", "Parents often praise their children when they demonstrate kindness to animals."),
    ("The company increased its profits because they're customer service was outstanding.", "confusion", "they're customer service", "their customer service", "The company increased its profits because their customer service was outstanding."),
    ("In their was a mysterious wooden box covered in intricate carved symbols.", "confusion", "In their was", "In there was", "In there was a mysterious wooden box covered in intricate carved symbols."),
    ("Their is no excuse for such irresponsible behaviour in a scientific laboratory.", "confusion", "Their is", "There is", "There is no excuse for such irresponsible behaviour in a scientific laboratory."),
    ("Their was an overwhelming sense of relief when the storm finally passed over.", "confusion", "Their was", "There was", "There was an overwhelming sense of relief when the storm finally passed over."),
    ("Their were twenty candidates competing for the prestigious research fellowship.", "confusion", "Their were", "There were", "There were twenty candidates competing for the prestigious research fellowship."),
    ("The cat rubbed it's head against my ankle and began to purr contentedly.", "confusion", "it's head", "its head", "The cat rubbed its head against my ankle and began to purr contentedly."),
    ("The telescope pointed toward the moon to photograph it's cratered surface.", "confusion", "it's cratered surface", "its cratered surface", "The telescope pointed toward the moon to photograph its cratered surface."),
    ("The startup announced that it's revenue had doubled within six short months.", "confusion", "it's revenue", "its revenue", "The startup announced that its revenue had doubled within six short months."),
    ("The antique grandfather clock had lost it's pendulum during the recent move.", "confusion", "it's pendulum", "its pendulum", "The antique grandfather clock had lost its pendulum during the recent move."),
    ("Although its a challenging assignment, we expect to finish before the weekend.", "confusion", "its a", "it's a", "Although it's a challenging assignment, we expect to finish before the weekend."),
    ("I believe its going to rain before the outdoor concert commences this evening.", "confusion", "its going", "it's going", "I believe it's going to rain before the outdoor concert commences this evening."),
    ("When its cold outside, the birds gather around the heated water dispenser.", "confusion", "its cold", "it's cold", "When it's cold outside, the birds gather around the heated water dispenser."),
    ("In our estimation, its evident that the initial assumptions were incorrect.", "confusion", "its evident", "it's evident", "In our estimation, it's evident that the initial assumptions were incorrect."),
    ("The fresh coat of paint had an immediate affect on the atmosphere of the room.", "confusion", "immediate affect", "immediate effect", "The fresh coat of paint had an immediate effect on the atmosphere of the room."),
    ("The new environmental regulation had a direct affect on factory operations.", "confusion", "direct affect", "direct effect", "The new environmental regulation had a direct effect on factory operations."),
    ("This medication has no known side affect when taken according to instructions.", "confusion", "side affect", "side effect", "This medication has no known side effect when taken according to instructions."),
    ("The sudden interest rate rise produced a negative affect on property prices.", "confusion", "negative affect", "negative effect", "The sudden interest rate rise produced a negative effect on property prices."),
    ("He would rather study ancient history then pursue a career in modern finance.", "confusion", "rather study ancient history then", "rather study ancient history than", "He would rather study ancient history than pursue a career in modern finance."),
    ("The second prototype was much faster then the machine we evaluated in March.", "confusion", "faster then", "faster than", "The second prototype was much faster than the machine we evaluated in March."),
    ("We discovered that the house was older then the church standing in the village square.", "confusion", "older then", "older than", "We discovered that the house was older than the church standing in the village square."),
    ("The revised proposal is far better then the document submitted last Friday.", "confusion", "better then", "better than", "The revised proposal is far better than the document submitted last Friday."),
    ("You should of consulted the senior architect before demolishing the interior wall.", "confusion", "should of", "should have", "You should have consulted the senior architect before demolishing the interior wall."),
    ("They could of arrived on time if they had caught the earlier express train.", "confusion", "could of", "could have", "They could have arrived on time if they had caught the earlier express train."),
    ("We would of supported the initiative if more financial data had been provided.", "confusion", "would of", "would have", "We would have supported the initiative if more financial data had been provided."),
    ("The inspector must of noticed the cracked foundation during the morning survey.", "confusion", "must of", "must have", "The inspector must have noticed the cracked foundation during the morning survey."),
    ("The board agreed with the proposal in principal, though budget issues remain.", "confusion", "in principal", "in principle", "The board agreed with the proposal in principle, though budget issues remain."),
    ("As a matter of principal, the journalist refused to reveal her confidential source.", "confusion", "matter of principal", "matter of principle", "As a matter of principle, the journalist refused to reveal her confidential source."),

    # Natural Subject-Verb Agreement & Syntactic Errors
    ("The list of registered participants were displayed on the entrance bulletin board.", "grammar", "were displayed", "was displayed", "The list of registered participants was displayed on the entrance bulletin board."),
    ("One of the antique pocket watches are missing from the glass display case.", "grammar", "are missing", "is missing", "One of the antique pocket watches is missing from the glass display case."),
    ("The quality of these freshly picked apples are exceptional this autumn season.", "grammar", "are exceptional", "is exceptional", "The quality of these freshly picked apples is exceptional this autumn season."),
    ("Neither the teacher nor the students was aware of the unexpected schedule change.", "grammar", "was aware", "were aware", "Neither the teacher nor the students were aware of the unexpected schedule change."),
    ("The group of enthusiastic volunteers were planting young saplings along the riverbank.", "grammar", "were planting", "was planting", "The group of enthusiastic volunteers was planting young saplings along the riverbank."),
    ("A bouquet of yellow roses were delivered to her office on Tuesday morning.", "grammar", "were delivered", "was delivered", "A bouquet of yellow roses was delivered to her office on Tuesday morning."),
    ("The heavy flow of commuter vehicles cause severe delays during rush hour.", "grammar", "cause severe", "causes severe", "The heavy flow of commuter vehicles causes severe delays during rush hour."),
    ("Each of the newly appointed ambassadors have submitted their credentials.", "grammar", "have submitted", "has submitted", "Each of the newly appointed ambassadors has submitted their credentials."),
    ("The variety of organic vegetables in the market appeal to health-conscious shoppers.", "grammar", "appeal to", "appeals to", "The variety of organic vegetables in the market appeals to health-conscious shoppers."),
    ("A large sum of public funds were allocated to the infrastructure overhaul.", "grammar", "were allocated", "was allocated", "A large sum of public funds was allocated to the infrastructure overhaul."),
    ("The sound of church bells echo across the quiet valley every Sunday morning.", "grammar", "echo across", "echoes across", "The sound of church bells echoes across the quiet valley every Sunday morning."),
    ("Every one of the submitted essays were reviewed by two independent examiners.", "grammar", "were reviewed", "was reviewed", "Every one of the submitted essays was reviewed by two independent examiners."),
    ("The shipment of imported medical supplies have arrived at the coastal port.", "grammar", "have arrived", "has arrived", "The shipment of imported medical supplies has arrived at the coastal port."),
    ("Neither of the proposed solutions solve the root cause of the network bottleneck.", "grammar", "solve the", "solves the", "Neither of the proposed solutions solves the root cause of the network bottleneck."),
    ("The rapid expansion of suburban housing developments threaten local wetlands.", "grammar", "threaten local", "threatens local", "The rapid expansion of suburban housing developments threatens local wetlands."),

    # Article / Determiner Discord
    ("She offered me an useful recommendation regarding my university application.", "grammar", "an useful", "a useful", "She offered me a useful recommendation regarding my university application."),
    ("He made a honest mistake when calculating the total cost of the renovation.", "grammar", "a honest", "an honest", "He made an honest mistake when calculating the total cost of the renovation."),
    ("The museum acquired an unique collection of eighteenth-century oil paintings.", "grammar", "an unique", "a unique", "The museum acquired a unique collection of eighteenth-century oil paintings."),
    ("It was a historic occasion when the two rival leaders signed the treaty.", "grammar", "a historic", "an historic", "It was an historic occasion when the two rival leaders signed the treaty."),
    ("The astronomer observed an European satellite passing over the observatory.", "grammar", "an European", "a European", "The astronomer observed a European satellite passing over the observatory."),
    ("We spent a hour walking through the botanical gardens in the gentle rain.", "grammar", "a hour", "an hour", "We spent an hour walking through the botanical gardens in the gentle rain."),
    ("She has an university degree in molecular biology from Oxford.", "grammar", "an university", "a university", "She has a university degree in molecular biology from Oxford."),
    ("The young musician gave a outstanding performance in the national concerto finals.", "grammar", "a outstanding", "an outstanding", "The young musician gave an outstanding performance in the national concerto finals."),
    ("He lived in an quiet village surrounded by steep forested hills.", "grammar", "an quiet", "a quiet", "He lived in a quiet village surrounded by steep forested hills."),
    ("She wore a elegant black evening dress to the charity fundraising gala.", "grammar", "a elegant", "an elegant", "She wore an elegant black evening dress to the charity fundraising gala."),

    # Natural Redundancy & Wordiness in Formal Prose
    ("The laboratory is located in close proximity to the university hospital.", "wordiness", "in close proximity to", "near", "The laboratory is located near the university hospital."),
    ("The project failed due to the fact that necessary funding was withdrawn.", "wordiness", "due to the fact that", "because", "The project failed because necessary funding was withdrawn."),
    ("At this point in time, the directors have decided not to pursue a merger.", "wordiness", "At this point in time,", "Currently,", "Currently, the directors have decided not to pursue a merger."),
    ("We must finalize our future plans before presenting the strategy to shareholders.", "wordiness", "future plans", "plans", "We must finalize our plans before presenting the strategy to shareholders."),
    ("The end result of the scientific experiment confirmed our original hypothesis.", "wordiness", "end result", "result", "The result of the scientific experiment confirmed our original hypothesis."),
    ("In order to reduce operating expenses, the firm consolidated its branch offices.", "wordiness", "In order to", "To", "To reduce operating expenses, the firm consolidated its branch offices."),
    ("Submit all required documentation prior to the beginning of the academic semester.", "wordiness", "prior to", "before", "Submit all required documentation before the beginning of the academic semester."),
    ("In my personal opinion, the proposed regulatory framework is too restrictive.", "wordiness", "In my personal opinion,", "In my opinion,", "In my opinion, the proposed regulatory framework is too restrictive."),
    ("The factory was completely destroyed by the intense fire that broke out at midnight.", "wordiness", "completely destroyed", "destroyed", "The factory was destroyed by the intense fire that broke out at midnight."),
    ("The contract will terminate at a later date if performance targets are missed.", "wordiness", "at a later date", "later", "The contract will terminate later if performance targets are missed."),
    ("They reached a consensus of opinion after extensive consultations with staff.", "wordiness", "consensus of opinion", "consensus", "They reached a consensus after extensive consultations with staff."),
    ("The committee will summarize briefly the main findings of the audit report.", "wordiness", "summarize briefly", "summarize", "The committee will summarize the main findings of the audit report."),
    ("The two companies decided to join together to bid for the infrastructure contract.", "wordiness", "join together", "join", "The two companies decided to join to bid for the infrastructure contract."),
    ("We should eradicate completely all traces of the malware from the network.", "wordiness", "eradicate completely", "eradicate", "We should eradicate all traces of the malware from the network."),
    ("The basic fundamentals of quantum mechanics are introduced in the second year.", "wordiness", "basic fundamentals", "fundamentals", "The fundamentals of quantum mechanics are introduced in the second year."),

    # Repetition / Spacing / Punctuation in Real Writing
    ("We drove through the the narrow streets of the medieval walled town.", "repetition", "the the", "the", "We drove through the narrow streets of the medieval walled town."),
    ("She told us that that her family had lived in Gloucestershire for centuries.", "repetition", "that that", "that", "She told us that her family had lived in Gloucestershire for centuries."),
    ("Please verify that you have had had sufficient time to review the proposal.", "repetition", "had had", "had", "Please verify that you have had sufficient time to review the proposal."),
    ("The train was delayed ,and many passengers missed their connecting flights.", "punctuation", " ,", ",", "The train was delayed, and many passengers missed their connecting flights."),
    ("Bring bread,cheese, and wine for the outdoor celebration in the park.", "punctuation", "bread,cheese", "bread, cheese", "Bring bread, cheese, and wine for the outdoor celebration in the park."),
    ("The museum is closed on mondays throughout the winter tourism season.", "capitalisation", "mondays", "Mondays", "The museum is closed on Mondays throughout the winter tourism season."),
]

all_items = []
current_id = 1

for sentence, source in clean_sentences:
    words = len(sentence.split())
    all_items.append({
        "id": current_id,
        "source": source,
        "is_clean": True,
        "sentence": sentence,
        "word_count": words,
        "expected_category": "control",
        "expected_error": None,
        "expected_replacement": None,
        "replacement_correct": sentence
    })
    current_id += 1

for item in error_sentences:
    sentence, cat, err, rep, corrected = item
    words = len(sentence.split())
    all_items.append({
        "id": current_id,
        "source": "held_out_natural_errors",
        "is_clean": False,
        "sentence": sentence,
        "word_count": words,
        "expected_category": cat,
        "expected_error": err,
        "expected_replacement": rep,
        "replacement_correct": corrected
    })
    current_id += 1

out_path = "/Users/joerey/.gemini/antigravity/scratch/wordtune-personal/fixtures/gec/held_out.jsonl"
with open(out_path, "w") as f:
    for item in all_items:
        f.write(json.dumps(item) + "\n")

clean_count = sum(1 for it in all_items if it["is_clean"])
clean_words = sum(it["word_count"] for it in all_items if it["is_clean"])
error_count = sum(1 for it in all_items if not it["is_clean"])
error_words = sum(it["word_count"] for it in all_items if not it["is_clean"])

print(f"Total Sentences: {len(all_items)}")
print(f"Clean Subset: {clean_count} sentences ({clean_words} total words)")
print(f"Error Subset: {error_count} sentences ({error_words} total words)")
print(f"Wrote to {out_path}")

extra_clean = [
    ("The autumn leaves drifted silently across the damp gravel path leading to the churchyard.", "conan_doyle"),
    ("He took a silver watch from his waistcoat pocket and glanced at the time with an anxious frown.", "conan_doyle"),
    ("A gentle breeze stirred the curtains of the open window, carrying the sweet scent of honeysuckle.", "austen"),
    ("She had neither the inclination nor the leisure to cultivate frivolous acquaintances in the capital.", "austen"),
    ("The true purpose of historical scholarship is to illuminate the present through the prism of the past.", "russell"),
    ("Every generalization of this kind must be accepted with caution, for exceptions are always numerous.", "russell"),
    ("The mechanical clock was undoubtedly one of the most transformative inventions of the medieval era.", "wells"),
    ("He placed his hands upon the polished brass levers and waited for the vibration to cease.", "wells"),
    ("Good prose is like a windowpane, through which the writer's thought is perceived without distortion.", "orwell"),
    ("In any society where freedom of expression is valued, disagreement should be welcomed rather than suppressed.", "orwell"),
    ("The hikers paused by the mountain stream to replenish their water flasks before ascending the ridge.", "homophone_control"),
    ("There is no justification for assuming that their initial failure implies a lack of competence.", "homophone_control"),
    ("The loose fitting garments worn in arid climates help reduce moisture loss during travel.", "homophone_control"),
    ("We must carefully consider whether this policy will lead to improved working conditions.", "homophone_control"),
    ("The sudden thunderstorm forced the players to retreat to the pavilion until the rain stopped.", "homophone_control"),
]

extra_errors = [
    ("The young musician had an unparalelled talent for improvising complex jazz melodies.", "spelling", "unparalelled", "unparalleled", "The young musician had an unparalleled talent for improvising complex jazz melodies."),
    ("The archeological team unearthed a treasure of ancient coins beneath the temple ruins.", "spelling", "archeological", "archaeological", "The archeological team unearthed a treasure of ancient coins beneath the temple ruins."),
    ("We must avoid unecessary expenditure during the upcoming fiscal quarter.", "spelling", "unecessary", "unnecessary", "We must avoid unnecessary expenditure during the upcoming fiscal quarter."),
    ("The newly published dictionary contains thousands of accurate definations of technical terms.", "spelling", "definations", "definitions", "The newly published dictionary contains thousands of accurate definitions of technical terms."),
    ("He had a tendency to exaggerate his acheivements when speaking to prospective employers.", "spelling", "acheivements", "achievements", "He had a tendency to exaggerate his achievements when speaking to prospective employers."),
    ("The committee have voted against the proposal to construct a highway bypass.", "grammar", "have voted", "has voted", "The committee has voted against the proposal to construct a highway bypass."),
    ("A swarm of aggressive wasps were buzzing around the fallen peaches in the orchard.", "grammar", "were buzzing", "was buzzing", "A swarm of aggressive wasps was buzzing around the fallen peaches in the orchard."),
    ("The collection of rare postage stamps were sold at auction for a record price.", "grammar", "were sold", "was sold", "The collection of rare postage stamps was sold at auction for a record price."),
    ("She gave him an helpful piece of advice before he entered the examination hall.", "grammar", "an helpful", "a helpful", "She gave him a helpful piece of advice before he entered the examination hall."),
    ("He was an historic figure whose military campaigns altered the borders of Europe.", "grammar", "an historic", "a historic", "He was a historic figure whose military campaigns altered the borders of Europe."),
    ("The heavy rainstorm had an adverse affect on the afternoon football match.", "confusion", "adverse affect", "adverse effect", "The heavy rainstorm had an adverse effect on the afternoon football match."),
    ("They left there bicycles leaning against the stone wall outside the post office.", "confusion", "there bicycles", "their bicycles", "They left their bicycles leaning against the stone wall outside the post office."),
    ("It is essential that you do not loose your airline boarding pass before check-in.", "confusion", "not loose your", "not lose your", "It is essential that you do not lose your airline boarding pass before check-in."),
    ("The persistent neglect of routine maintenance has lead to mechanical failure.", "confusion", "has lead to", "has led to", "The persistent neglect of routine maintenance has led to mechanical failure."),
    ("We decided to meet at a future point in time to discuss the remaining contract details.", "wordiness", "at a future point in time", "later", "We decided to meet later to discuss the remaining contract details."),
]

for sentence, source in extra_clean:
    words = len(sentence.split())
    all_items.append({
        "id": current_id,
        "source": source,
        "is_clean": True,
        "sentence": sentence,
        "word_count": words,
        "expected_category": "control",
        "expected_error": None,
        "expected_replacement": None,
        "replacement_correct": sentence
    })
    current_id += 1

for item in extra_errors:
    sentence, cat, err, rep, corrected = item
    words = len(sentence.split())
    all_items.append({
        "id": current_id,
        "source": "held_out_natural_errors",
        "is_clean": False,
        "sentence": sentence,
        "word_count": words,
        "expected_category": cat,
        "expected_error": err,
        "expected_replacement": rep,
        "replacement_correct": corrected
    })
    current_id += 1

with open(out_path, "w") as f:
    for item in all_items:
        f.write(json.dumps(item) + "\n")

clean_count = sum(1 for it in all_items if it["is_clean"])
clean_words = sum(it["word_count"] for it in all_items if it["is_clean"])
error_count = sum(1 for it in all_items if not it["is_clean"])
error_words = sum(it["word_count"] for it in all_items if not it["is_clean"])

print(f"Updated Total Sentences: {len(all_items)}")
print(f"Clean Subset: {clean_count} sentences ({clean_words} total words)")
print(f"Error Subset: {error_count} sentences ({error_words} total words)")
