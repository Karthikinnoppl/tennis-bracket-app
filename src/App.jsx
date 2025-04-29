import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const TennisBracket = () => {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [matches, setMatches] = useState([]);
  const [playerPoints, setPlayerPoints] = useState({});
  const [customMatch, setCustomMatch] = useState({ team1: [], team2: [], date: '' });

  const maxPlayers = 12;

  useEffect(() => {
    const fetchData = async () => {
      const playersSnap = await getDocs(collection(db, 'players'));
      const loadedPlayers = playersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setPlayers(loadedPlayers);
      const initialPoints = {};
      loadedPlayers.forEach(p => {
        initialPoints[p.name] = p.points || 0;
      });
      setPlayerPoints(initialPoints);

      const matchesSnap = await getDocs(collection(db, 'matches'));
      const loadedMatches = matchesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setMatches(loadedMatches);
    };
    fetchData();
  }, []);

  const addPlayer = async () => {
    if (name.trim() !== '' && players.length < maxPlayers) {
      const newPlayer = { name: name.trim(), points: 0 };
      const docRef = await addDoc(collection(db, 'players'), newPlayer);
      setPlayers(prev => [...prev, { id: docRef.id, ...newPlayer }]);
      setPlayerPoints(prev => ({ ...prev, [newPlayer.name]: 0 }));
      setName('');
    }
  };

  const deletePlayer = async (playerId, playerName) => {
    await deleteDoc(doc(db, 'players', playerId));
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    setPlayerPoints(prev => {
      const updated = { ...prev };
      delete updated[playerName];
      return updated;
    });
  };

  const deleteMatch = async (index) => {
    const match = matches[index];
    const team1Wins = match.sets.filter(s => s === 1).length;
    const team2Wins = match.sets.filter(s => s === 2).length;
    const bonus1 = team1Wins > team2Wins ? 1 : 0;
    const bonus2 = team2Wins > team1Wins ? 1 : 0;
    const updated = { ...playerPoints };

    match.team1.forEach(p => {
      updated[p] = Math.max(0, (updated[p] || 0) - Math.min(3, team1Wins + bonus1));
    });
    match.team2.forEach(p => {
      updated[p] = Math.max(0, (updated[p] || 0) - Math.min(3, team2Wins + bonus2));
    });

    setPlayerPoints(updated);

    for (const name of [...match.team1, ...match.team2]) {
      const playerDoc = players.find(p => p.name === name);
      if (playerDoc) {
        await updateDoc(doc(db, 'players', playerDoc.id), { points: updated[name] });
      }
    }

    if (match.id) await deleteDoc(doc(db, 'matches', match.id));
    const newMatches = [...matches];
    newMatches.splice(index, 1);
    setMatches(newMatches);
  };

  const addManualMatch = async () => {
    if (customMatch.team1.length === 2 && customMatch.team2.length === 2 && customMatch.date) {
      const newMatch = {
        team1: customMatch.team1,
        team2: customMatch.team2,
        date: customMatch.date,
        sets: [0, 0, 0],
      };
      const docRef = await addDoc(collection(db, 'matches'), newMatch);
      setMatches(prev => [...prev, { id: docRef.id, ...newMatch }]);
      setCustomMatch({ team1: [], team2: [], date: '' });
    }
  };

  const updateMatchScore = async (matchIdx, setIdx, winnerTeam) => {
    const updated = [...matches];
    const match = updated[matchIdx];
    if (match.sets[setIdx] !== 0) return;
    match.sets[setIdx] = winnerTeam;

    const team1Wins = match.sets.filter(v => v === 1).length;
    const team2Wins = match.sets.filter(v => v === 2).length;

    if (team1Wins === 2 || team2Wins === 2) {
      const team1Bonus = team1Wins > team2Wins ? 1 : 0;
      const team2Bonus = team2Wins > team1Wins ? 1 : 0;
      const updatedPoints = { ...playerPoints };

      match.team1.forEach(p => {
        updatedPoints[p] = (updatedPoints[p] || 0) + Math.min(3, team1Wins + team1Bonus);
      });
      match.team2.forEach(p => {
        updatedPoints[p] = (updatedPoints[p] || 0) + Math.min(3, team2Wins + team2Bonus);
      });

      setPlayerPoints(updatedPoints);

      for (const name of [...match.team1, ...match.team2]) {
        const playerDoc = players.find(p => p.name === name);
        if (playerDoc) {
          await updateDoc(doc(db, 'players', playerDoc.id), { points: updatedPoints[name] });
        }
      }
    }

    setMatches(updated);

    if (match.id) {
      await updateDoc(doc(db, 'matches', match.id), { sets: match.sets });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-200 to-blue-200 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-center">🎾 Tennis Doubles Scheduler</h1>

        <div className="flex gap-2 justify-center mb-6">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter player name" className="px-3 py-2 border rounded w-64" />
          <button onClick={addPlayer} className="bg-blue-600 text-white px-4 py-2 rounded">Add Player</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {players.map(p => {
            const inTeam1 = customMatch.team1.includes(p.name);
            const inTeam2 = customMatch.team2.includes(p.name);
            const highlightClass = inTeam1
              ? 'bg-blue-100 border border-blue-300'
              : inTeam2
              ? 'bg-purple-100 border border-purple-300'
              : 'bg-white';

            return (
              <div key={p.id} className={`relative p-3 rounded shadow text-center font-semibold ${highlightClass}`}>
                <button
                  onClick={() => deletePlayer(p.id, p.name)}
                  className="absolute top-1 right-2 text-red-600 text-sm hover:text-red-800"
                  title="Remove player"
                >
                  ❌
                </button>
                <div className="mb-2">{p.name}</div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setCustomMatch(prev => ({ ...prev, team1: [...prev.team1, p.name].slice(0, 2) }))}
                    className="text-xs text-indigo-700 hover:underline"
                  >
                    Add in Team1
                  </button>
                  <button
                    onClick={() => setCustomMatch(prev => ({ ...prev, team2: [...prev.team2, p.name].slice(0, 2) }))}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Add in Team2
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-8 bg-white p-4 rounded shadow">
          <h2 className="text-lg font-bold mb-2">📅 Manually Schedule a Match</h2>
          <div className="mb-2">Team 1: {customMatch.team1.join(' & ')} | Team 2: {customMatch.team2.join(' & ')}</div>
          <input type="date" value={customMatch.date} onChange={(e) => setCustomMatch(prev => ({ ...prev, date: e.target.value }))} className="px-2 py-1 border rounded mr-2" />
          <button onClick={addManualMatch} className="bg-teal-600 text-white px-3 py-1 rounded">Add Match</button>
        </div>

        <h2 className="text-xl font-bold mb-3">📅 Scheduled Matches</h2>
        <div className="grid gap-4">
          {matches.map((match, idx) => {
            const team1Wins = match.sets.filter(v => v === 1).length;
            const team2Wins = match.sets.filter(v => v === 2).length;
            const isMatchOver = team1Wins === 2 || team2Wins === 2;

            return (
              <div key={match.id || idx} className={`p-3 rounded shadow ${isMatchOver ? 'bg-gray-200' : 'bg-white'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span>{match.date}</span> — <span>{match.team1.join(' & ')} vs {match.team2.join(' & ')}</span>
                  </div>
                  <button onClick={() => deleteMatch(idx)} className="text-sm text-red-600">Delete</button>
                </div>
                <div className="mt-2 text-sm">
                  {[0, 1, 2].map((setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2 mb-1">
                      <span>Set {setIdx + 1}:</span>
                      <button onClick={() => updateMatchScore(idx, setIdx, 1)} disabled={isMatchOver || match.sets[setIdx] !== 0} className="bg-indigo-500 text-white px-2 py-1 rounded text-xs">Team 1 Win</button>
                      <button onClick={() => updateMatchScore(idx, setIdx, 2)} disabled={isMatchOver || match.sets[setIdx] !== 0} className="bg-purple-500 text-white px-2 py-1 rounded text-xs">Team 2 Win</button>
                      <span className="ml-2">Winner: {match.sets[setIdx] ? `Team ${match.sets[setIdx]}` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-bold mt-10 mb-3">🏆 Player Rankings</h2>
        <div className="bg-white p-4 rounded shadow">
          <ul>
            {Object.entries(playerPoints).sort((a, b) => b[1] - a[1]).map(([player, points], idx) => (
              <li key={idx} className="py-1 border-b last:border-none flex justify-between">
                <span>{player}</span>
                <span>{points} pts</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TennisBracket;
